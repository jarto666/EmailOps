import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComponentDto, UpdateComponentDto } from './dto';
import { ContentType } from '@prisma/client';
import mjml2html from 'mjml';

@Injectable()
export class ComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateComponentDto) {
    // Check for duplicate name
    const existing = await this.prisma.component.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Component "${dto.name}" already exists`);
    }

    // Generate preview HTML
    const previewHtml = await this.generatePreview(
      dto.content,
      dto.contentType ?? ContentType.MJML,
      dto.variables ?? [],
    );

    return this.prisma.component.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        contentType: dto.contentType ?? ContentType.MJML,
        content: dto.content,
        variables: (dto.variables ?? []) as any,
        previewHtml,
      },
    });
  }

  async findAll(workspaceId: string, type?: string) {
    const where: any = { workspaceId };
    if (type) {
      where.type = type;
    }

    return this.prisma.component.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(workspaceId: string, id: string) {
    const component = await this.prisma.component.findFirst({
      where: { id, workspaceId },
    });

    if (!component) {
      throw new NotFoundException(`Component not found`);
    }

    return component;
  }

  async findByName(workspaceId: string, name: string) {
    const component = await this.prisma.component.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
    });

    if (!component) {
      throw new NotFoundException(`Component "${name}" not found`);
    }

    return component;
  }

  async update(workspaceId: string, id: string, dto: UpdateComponentDto) {
    const existing = await this.prisma.component.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Component not found`);
    }

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.component.findUnique({
        where: {
          workspaceId_name: {
            workspaceId,
            name: dto.name,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Component "${dto.name}" already exists`);
      }
    }

    // Regenerate preview if content changed
    let previewHtml = existing.previewHtml;
    if (dto.content || dto.contentType) {
      previewHtml = await this.generatePreview(
        dto.content ?? existing.content,
        dto.contentType ?? existing.contentType,
        (dto.variables ?? existing.variables) as any[],
      );
    }

    const updateData: any = {
      ...dto,
      previewHtml,
    };
    if (dto.variables !== undefined) {
      updateData.variables = dto.variables as any;
    }
    return this.prisma.component.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.component.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Component not found`);
    }

    await this.prisma.component.delete({
      where: { id },
    });

    return { success: true };
  }

  async preview(workspaceId: string, id: string, variables?: Record<string, any>) {
    const component = await this.findOne(workspaceId, id);

    let content = component.content;

    // Apply variables
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value));
      }
    }

    // Apply default values for remaining variables
    const componentVars = component.variables as any[];
    if (componentVars) {
      for (const v of componentVars) {
        if (v.defaultValue) {
          content = content.replace(
            new RegExp(`\\{\\{\\s*${v.name}\\s*\\}\\}`, 'g'),
            v.defaultValue
          );
        }
      }
    }

    const html = await this.generatePreview(content, component.contentType, []);
    return { html, content };
  }

  /**
   * Load all components as Handlebars partials
   */
  async loadAllAsPartials(workspaceId: string): Promise<Map<string, string>> {
    const components = await this.prisma.component.findMany({
      where: { workspaceId },
      select: { name: true, content: true, contentType: true },
    });

    const partials = new Map<string, string>();
    for (const component of components) {
      partials.set(component.name, component.content);
    }

    return partials;
  }

  private async generatePreview(
    content: string,
    contentType: ContentType,
    variables: any[],
  ): Promise<string> {
    // Apply default values
    let processedContent = content;
    for (const v of variables) {
      if (v.defaultValue) {
        processedContent = processedContent.replace(
          new RegExp(`\\{\\{\\s*${v.name}\\s*\\}\\}`, 'g'),
          v.defaultValue
        );
      }
    }

    if (contentType === ContentType.MJML) {
      try {
        // Wrap in minimal MJML structure for preview
        const wrappedMjml = `
          <mjml>
            <mj-body>
              <mj-section>
                <mj-column>
                  ${processedContent}
                </mj-column>
              </mj-section>
            </mj-body>
          </mjml>
        `;
        const result = mjml2html(wrappedMjml, { minify: false });
        return result.html;
      } catch (error: any) {
        // Return raw content if MJML compilation fails
        return `<div style="color: red;">MJML Error: ${error?.message ?? 'Unknown error'}</div><pre>${processedContent}</pre>`;
      }
    }

    // HTML content - wrap in basic structure
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${processedContent}</body></html>`;
  }
}
