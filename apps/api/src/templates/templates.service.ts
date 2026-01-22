import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthoringMode, TemplateCategory } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, input: {
    key: string;
    name: string;
    category?: TemplateCategory;
  }) {
    try {
      if (!workspaceId || workspaceId.trim().length === 0) {
        throw new BadRequestException("workspaceId is required.");
      }

      // Ensure workspace exists so Template.workspaceId FK doesn't fail.
      // This keeps the API usable early on before we have full Workspaces CRUD/UI.
      await this.prisma.workspace.upsert({
        where: { id: workspaceId },
        update: {},
        create: { id: workspaceId, name: "Default Workspace" },
      });

      // Create template with initial version in a transaction
      const template = await this.prisma.template.create({
        data: {
          workspaceId,
          key: input.key,
          name: input.name,
          category: input.category ?? TemplateCategory.TRANSACTIONAL,
          versions: {
            create: {
              version: 1,
              subject: `Hello from ${input.name}`,
              mode: AuthoringMode.RAW_HTML,
              bodyHtml: `<h1>Hello {{user.firstName}}</h1>\n<p>This is your ${input.name} template.</p>`,
              active: true,
            },
          },
        },
        include: {
          versions: true,
        },
      });

      return template;
    } catch (e: any) {
      // Prisma FK violation / constraint errors are too opaque; surface a clearer message.
      if (
        typeof e?.message === "string" &&
        e.message.includes("Template_workspaceId_fkey")
      ) {
        throw new BadRequestException(
          "Invalid workspaceId. Create the workspace first (or use an existing workspaceId)."
        );
      }
      throw new BadRequestException(e?.message ?? "Failed to create template");
    }
  }

  async list(workspaceId: string) {
    return this.prisma.template.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        versions: {
          where: { active: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async get(workspaceId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, workspaceId },
      include: {
        versions: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!template) throw new NotFoundException("Template not found");
    return template;
  }

  async update(workspaceId: string, id: string, input: any) {
    const existing = await this.prisma.template.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Template not found");

    try {
      return await this.prisma.template.update({
        where: { id },
        data: {
          key: input.key ?? undefined,
          name: input.name ?? undefined,
          category: input.category ?? undefined,
        },
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? "Failed to update template");
    }
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.template.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Template not found");

    // Remove versions first to avoid FK constraint issues.
    await this.prisma.$transaction([
      this.prisma.templateVersion.deleteMany({ where: { templateId: id } }),
      this.prisma.template.delete({ where: { id } }),
    ]);
    return { ok: true };
  }
}
