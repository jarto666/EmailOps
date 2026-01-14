import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { JourneyNodeType, JourneyStatus } from "@email-ops/core";
import { PrismaService } from "../prisma/prisma.service";

function assertNonEmptyString(v: any, name: string) {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new BadRequestException(`${name} is required.`);
  }
}

@Injectable()
export class JourneysService {
  constructor(private prisma: PrismaService) {}

  async create(input: { workspaceId: string; name: string }) {
    assertNonEmptyString(input.workspaceId, "workspaceId");
    assertNonEmptyString(input.name, "name");

    await this.prisma.workspace.upsert({
      where: { id: input.workspaceId },
      update: {},
      create: { id: input.workspaceId, name: "Default Workspace" },
    });

    // Start with version 1 scaffold.
    return this.prisma.journey.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        status: JourneyStatus.DRAFT,
        versions: { create: { version: 1 } },
      },
      include: { versions: true },
    });
  }

  async list(workspaceId: string) {
    return this.prisma.journey.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
  }

  async get(workspaceId: string, id: string) {
    const journey = await this.prisma.journey.findFirst({
      where: { id, workspaceId },
      include: {
        versions: { orderBy: { version: "desc" }, take: 10 },
      },
    });
    if (!journey) throw new NotFoundException("Journey not found");
    return journey;
  }

  async getVersion(workspaceId: string, journeyId: string, versionId: string) {
    const journey = await this.prisma.journey.findFirst({
      where: { id: journeyId, workspaceId },
      select: { id: true },
    });
    if (!journey) throw new NotFoundException("Journey not found");

    const version = await this.prisma.journeyVersion.findFirst({
      where: { id: versionId, journeyId },
      include: { nodes: true, edges: true },
    });
    if (!version) throw new NotFoundException("Journey version not found");
    return version;
  }

  async update(workspaceId: string, id: string, input: { name?: string; status?: JourneyStatus }) {
    const existing = await this.prisma.journey.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Journey not found");

    return this.prisma.journey.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        status: input.status ?? undefined,
      },
    });
  }

  async upsertDraftVersion(
    workspaceId: string,
    journeyId: string,
    input: {
      nodes: Array<{ nodeKey: string; type: JourneyNodeType; config?: any }>;
      edges: Array<{ fromNodeKey: string; toNodeKey: string; condition?: any }>;
    }
  ) {
    const journey = await this.prisma.journey.findFirst({
      where: { id: journeyId, workspaceId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!journey) throw new NotFoundException("Journey not found");

    const latest = journey.versions[0];
    if (!latest) throw new BadRequestException("Journey has no version");
    if (latest.publishedAt) {
      // Create next version if latest is published.
      const created = await this.prisma.journeyVersion.create({
        data: { journeyId, version: latest.version + 1 },
      });
      return this.replaceGraph(created.id, input);
    }
    return this.replaceGraph(latest.id, input);
  }

  private async replaceGraph(
    journeyVersionId: string,
    input: {
      nodes: Array<{ nodeKey: string; type: JourneyNodeType; config?: any }>;
      edges: Array<{ fromNodeKey: string; toNodeKey: string; condition?: any }>;
    }
  ) {
    this.validateGraph(input.nodes, input.edges);

    await this.prisma.$transaction([
      this.prisma.journeyEdge.deleteMany({ where: { journeyVersionId } }),
      this.prisma.journeyNode.deleteMany({ where: { journeyVersionId } }),
      this.prisma.journeyNode.createMany({
        data: input.nodes.map((n) => ({
          journeyVersionId,
          nodeKey: n.nodeKey,
          type: n.type,
          config: n.config ?? undefined,
        })),
      }),
      this.prisma.journeyEdge.createMany({
        data: input.edges.map((e) => ({
          journeyVersionId,
          fromNodeKey: e.fromNodeKey,
          toNodeKey: e.toNodeKey,
          condition: e.condition ?? undefined,
        })),
      }),
    ]);

    return this.prisma.journeyVersion.findFirst({
      where: { id: journeyVersionId },
      include: { nodes: true, edges: true },
    });
  }

  async publish(workspaceId: string, journeyId: string) {
    const journey = await this.prisma.journey.findFirst({
      where: { id: journeyId, workspaceId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!journey) throw new NotFoundException("Journey not found");

    const version = journey.versions[0];
    if (!version) throw new BadRequestException("Journey has no version");
    if (version.publishedAt) throw new BadRequestException("Latest version already published");

    const nodes = await this.prisma.journeyNode.findMany({ where: { journeyVersionId: version.id } });
    const edges = await this.prisma.journeyEdge.findMany({ where: { journeyVersionId: version.id } });
    this.validateGraph(
      nodes.map((n) => ({ nodeKey: n.nodeKey, type: n.type as any })),
      edges.map((e) => ({ fromNodeKey: e.fromNodeKey, toNodeKey: e.toNodeKey }))
    );

    return this.prisma.journeyVersion.update({
      where: { id: version.id },
      data: { publishedAt: new Date() },
    });
  }

  private validateGraph(
    nodes: Array<{ nodeKey: string; type: JourneyNodeType }>,
    edges: Array<{ fromNodeKey: string; toNodeKey: string }>
  ) {
    const nodeKeys = new Set(nodes.map((n) => n.nodeKey));
    if (nodeKeys.size !== nodes.length) {
      throw new BadRequestException("Duplicate nodeKey in nodes.");
    }
    const entry = nodes.filter((n) => n.type === JourneyNodeType.ENTRY_EVENT);
    if (entry.length !== 1) {
      throw new BadRequestException("Exactly one ENTRY_EVENT node is required.");
    }
    for (const e of edges) {
      if (!nodeKeys.has(e.fromNodeKey) || !nodeKeys.has(e.toNodeKey)) {
        throw new BadRequestException("Edge references unknown nodeKey.");
      }
    }
  }
}

