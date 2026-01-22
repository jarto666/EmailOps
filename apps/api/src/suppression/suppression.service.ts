import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SuppressionReason } from '@prisma/client';
import { CreateSuppressionDto } from './dto';

/**
 * SuppressionService - CRUD operations for managing suppressions via API
 */
@Injectable()
export class SuppressionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateSuppressionDto) {
    // Ensure workspace exists
    await this.prisma.workspace.upsert({
      where: { id: workspaceId },
      update: {},
      create: { id: workspaceId, name: 'Default Workspace' },
    });

    const normalizedEmail = dto.email.toLowerCase();

    // Check if already exists
    const existing = await this.prisma.suppression.findUnique({
      where: {
        workspaceId_email: {
          workspaceId,
          email: normalizedEmail,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already suppressed`);
    }

    return this.prisma.suppression.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        reason: dto.reason,
      },
    });
  }

  async findAll(
    workspaceId: string,
    options?: {
      reason?: SuppressionReason;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const { reason, search, limit = 50, offset = 0 } = options ?? {};

    const where: any = { workspaceId };

    if (reason) {
      where.reason = reason;
    }

    if (search) {
      where.email = { contains: search.toLowerCase() };
    }

    const [items, total] = await Promise.all([
      this.prisma.suppression.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.suppression.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  async findOne(workspaceId: string, id: string) {
    const suppression = await this.prisma.suppression.findFirst({
      where: { id, workspaceId },
    });

    if (!suppression) {
      throw new NotFoundException('Suppression not found');
    }

    return suppression;
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.suppression.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Suppression not found');
    }

    await this.prisma.suppression.delete({
      where: { id },
    });

    return { success: true };
  }

  async removeByEmail(workspaceId: string, email: string) {
    const normalizedEmail = email.toLowerCase();

    const existing = await this.prisma.suppression.findUnique({
      where: {
        workspaceId_email: {
          workspaceId,
          email: normalizedEmail,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Suppression for email "${email}" not found`);
    }

    await this.prisma.suppression.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }

  async isEmailSuppressed(workspaceId: string, email: string) {
    const normalizedEmail = email.toLowerCase();

    const suppression = await this.prisma.suppression.findUnique({
      where: {
        workspaceId_email: {
          workspaceId,
          email: normalizedEmail,
        },
      },
    });

    return {
      suppressed: !!suppression,
      reason: suppression?.reason ?? null,
    };
  }

  async batchCheckSuppressions(workspaceId: string, emails: string[]) {
    const normalizedEmails = emails.map((e) => e.toLowerCase());

    const suppressions = await this.prisma.suppression.findMany({
      where: {
        workspaceId,
        email: { in: normalizedEmails },
      },
      select: {
        email: true,
        reason: true,
      },
    });

    const suppressionMap: Record<string, SuppressionReason> = {};
    for (const s of suppressions) {
      suppressionMap[s.email] = s.reason;
    }

    return emails.map((email) => {
      const normalizedEmail = email.toLowerCase();
      const reason = suppressionMap[normalizedEmail];
      return {
        email,
        suppressed: !!reason,
        reason: reason ?? null,
      };
    });
  }

  async addSuppression(
    workspaceId: string,
    email: string,
    reason: SuppressionReason
  ) {
    const normalizedEmail = email.toLowerCase();

    return this.prisma.suppression.upsert({
      where: {
        workspaceId_email: {
          workspaceId,
          email: normalizedEmail,
        },
      },
      create: {
        workspaceId,
        email: normalizedEmail,
        reason,
      },
      update: {
        reason,
      },
    });
  }

  async getStats(workspaceId: string) {
    const stats = await this.prisma.suppression.groupBy({
      by: ['reason'],
      where: { workspaceId },
      _count: true,
    });

    const total = stats.reduce((acc, s) => acc + s._count, 0);

    return {
      total,
      byReason: stats.map((s) => ({
        reason: s.reason,
        count: s._count,
      })),
    };
  }

  // ============================================
  // Methods used by processors (internal use)
  // ============================================

  /**
   * Batch check suppressions returning a Map (used by processors for efficient lookup)
   */
  async batchCheckSuppressionsMap(
    workspaceId: string,
    emails: string[],
  ): Promise<Map<string, SuppressionReason>> {
    const normalizedEmails = emails.map((e) => e.toLowerCase());

    const suppressions = await this.prisma.suppression.findMany({
      where: {
        workspaceId,
        email: { in: normalizedEmails },
      },
      select: {
        email: true,
        reason: true,
      },
    });

    const suppressionMap = new Map<string, SuppressionReason>();
    for (const s of suppressions) {
      suppressionMap.set(s.email.toLowerCase(), s.reason);
    }

    return suppressionMap;
  }

  /**
   * Add suppression silently (used by processors when handling bounces/complaints)
   */
  async addSuppressionSilent(
    workspaceId: string,
    email: string,
    reason: SuppressionReason,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase();

    await this.prisma.suppression.upsert({
      where: {
        workspaceId_email: {
          workspaceId,
          email: normalizedEmail,
        },
      },
      create: {
        workspaceId,
        email: normalizedEmail,
        reason,
      },
      update: {
        reason,
      },
    });
  }
}
