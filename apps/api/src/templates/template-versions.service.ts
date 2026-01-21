import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthoringMode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RenderingService } from "./rendering.service";

@Injectable()
export class TemplateVersionsService {
  constructor(
    private prisma: PrismaService,
    private rendering: RenderingService
  ) {}

  private async ensureTemplate(workspaceId: string, templateId: string) {
    const t = await this.prisma.template.findFirst({
      where: { id: templateId, workspaceId },
      select: { id: true },
    });
    if (!t) throw new NotFoundException("Template not found");
  }

  async create(
    workspaceId: string,
    templateId: string,
    input: {
      subject: string;
      preheader?: string;
      mode: AuthoringMode;
      bodyHtml?: string;
      bodyMjml?: string;
      builderSchema?: Record<string, any>;
    }
  ) {
    await this.ensureTemplate(workspaceId, templateId);

    // Basic invariants per mode.
    if (input.mode === AuthoringMode.RAW_HTML && !input.bodyHtml) {
      throw new BadRequestException("RAW_HTML versions require bodyHtml.");
    }
    if (input.mode === AuthoringMode.RAW_MJML && !input.bodyMjml) {
      throw new BadRequestException("RAW_MJML versions require bodyMjml.");
    }
    if (input.mode === AuthoringMode.UI_BUILDER && !input.builderSchema) {
      throw new BadRequestException("UI_BUILDER versions require builderSchema.");
    }

    // Get next version number
    const lastVersion = await this.prisma.templateVersion.findFirst({
      where: { templateId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    return this.prisma.templateVersion.create({
      data: {
        templateId,
        version: nextVersion,
        subject: input.subject,
        preheader: input.preheader ?? undefined,
        mode: input.mode,
        bodyHtml: input.bodyHtml ?? undefined,
        bodyMjml: input.bodyMjml ?? undefined,
        builderSchema: input.builderSchema ?? undefined,
      },
    });
  }

  async list(workspaceId: string, templateId: string) {
    await this.ensureTemplate(workspaceId, templateId);
    return this.prisma.templateVersion.findMany({
      where: { templateId },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(workspaceId: string, templateId: string, versionId: string) {
    await this.ensureTemplate(workspaceId, templateId);
    const v = await this.prisma.templateVersion.findFirst({
      where: { id: versionId, templateId },
    });
    if (!v) throw new NotFoundException("Template version not found");
    return v;
  }

  async update(
    workspaceId: string,
    templateId: string,
    versionId: string,
    input: {
      subject?: string;
      preheader?: string;
      mode?: AuthoringMode;
      bodyHtml?: string;
      bodyMjml?: string;
      builderSchema?: Record<string, any>;
    }
  ) {
    await this.ensureTemplate(workspaceId, templateId);
    const existing = await this.prisma.templateVersion.findFirst({
      where: { id: versionId, templateId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Template version not found");

    return this.prisma.templateVersion.update({
      where: { id: versionId },
      data: {
        subject: input.subject ?? undefined,
        preheader: input.preheader ?? undefined,
        mode: input.mode ?? undefined,
        bodyHtml: input.bodyHtml ?? undefined,
        bodyMjml: input.bodyMjml ?? undefined,
        builderSchema: input.builderSchema ?? undefined,
      },
    });
  }

  async publish(workspaceId: string, templateId: string, versionId: string) {
    const version = await this.get(workspaceId, templateId, versionId);

    // Compile and store bodyHtml at publish time for MJML/Builder.
    const compiled = this.rendering.compileFromVersion(version);

    await this.prisma.$transaction([
      this.prisma.templateVersion.updateMany({
        where: { templateId },
        data: { active: false },
      }),
      this.prisma.templateVersion.update({
        where: { id: versionId },
        data: { active: true, bodyHtml: compiled.html },
      }),
    ]);

    return { ok: true };
  }

  async render(
    workspaceId: string,
    templateId: string,
    versionId: string,
    variables: Record<string, any>
  ) {
    const version = await this.get(workspaceId, templateId, versionId);
    const compiled = this.rendering.compileFromVersion(version);
    const subject = this.rendering.renderHtml(compiled.subject, variables ?? {});
    const html = this.rendering.renderHtml(compiled.html, variables ?? {});
    return { subject, html };
  }
}

