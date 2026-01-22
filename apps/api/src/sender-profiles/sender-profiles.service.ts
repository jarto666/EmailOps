import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SenderProfilesService {
  constructor(private prisma: PrismaService) {}

  async create(input: {
    workspaceId: string;
    emailProviderConnectorId: string;
    fromEmail: string;
    fromName?: string;
    replyTo?: string;
  }) {
    // Ensure workspace exists
    await this.prisma.workspace.upsert({
      where: { id: input.workspaceId },
      update: {},
      create: { id: input.workspaceId, name: 'Default Workspace' },
    });

    const connector = await this.prisma.emailProviderConnector.findFirst({
      where: {
        id: input.emailProviderConnectorId,
        workspaceId: input.workspaceId,
      },
      select: { id: true },
    });
    if (!connector) {
      throw new BadRequestException(
        "emailProviderConnectorId must refer to an existing email provider connector in the same workspace."
      );
    }

    return this.prisma.senderProfile.create({
      data: {
        workspaceId: input.workspaceId,
        emailProviderConnectorId: input.emailProviderConnectorId,
        fromEmail: input.fromEmail,
        fromName: input.fromName ?? undefined,
        replyTo: input.replyTo ?? undefined,
      },
    });
  }

  async list(workspaceId: string) {
    return this.prisma.senderProfile.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        emailProviderConnector: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: { singleSends: true },
        },
      },
    });
  }

  async get(workspaceId: string, id: string) {
    const profile = await this.prisma.senderProfile.findFirst({
      where: { id, workspaceId },
      include: {
        emailProviderConnector: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException("Sender profile not found");
    return profile;
  }

  async update(workspaceId: string, id: string, input: any) {
    const existing = await this.prisma.senderProfile.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Sender profile not found");

    return this.prisma.senderProfile.update({
      where: { id },
      data: {
        fromEmail: input.fromEmail ?? undefined,
        fromName: input.fromName ?? undefined,
        replyTo: input.replyTo ?? undefined,
      },
    });
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.senderProfile.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Sender profile not found");
    await this.prisma.senderProfile.delete({ where: { id } });
    return { ok: true };
  }
}

