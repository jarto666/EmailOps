import { Injectable } from '@nestjs/common';
import { CollisionPolicy } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CollisionCheckResult {
  blocked: boolean;
  reason?: string;
  details?: {
    lastSentAt?: Date;
    higherPriorityCampaign?: string;
  };
}

export interface RecipientWithCollision {
  subjectId: string;
  email: string;
  vars?: Record<string, any>;
  collisionResult: CollisionCheckResult;
}

/**
 * CollisionService - handles collision detection for email campaigns
 */
@Injectable()
export class CollisionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a recipient should be blocked due to collision with previous sends
   */
  async checkCollision(
    workspaceId: string,
    subjectId: string,
    campaignGroupId: string | null,
    collisionWindow: number,
  ): Promise<CollisionCheckResult> {
    if (!campaignGroupId) {
      return { blocked: false };
    }

    const windowStart = new Date(Date.now() - collisionWindow * 1000);

    const recentSend = await this.prisma.sendLog.findFirst({
      where: {
        workspaceId,
        subjectId,
        campaignGroupId,
        sentAt: { gte: windowStart },
      },
      orderBy: { sentAt: 'desc' },
      include: {
        singleSend: {
          select: { name: true },
        },
      },
    });

    if (recentSend) {
      return {
        blocked: true,
        reason: 'collision:already_sent',
        details: {
          lastSentAt: recentSend.sentAt,
        },
      };
    }

    return { blocked: false };
  }

  /**
   * Check if a recipient should be blocked due to a higher-priority campaign
   */
  async checkPriorityCollision(
    workspaceId: string,
    subjectId: string,
    campaignGroupId: string | null,
    currentPriority: number,
  ): Promise<CollisionCheckResult> {
    if (!campaignGroupId) {
      return { blocked: false };
    }

    const higherPriorityRecipient = await this.prisma.singleSendRecipient.findFirst({
      where: {
        subjectId,
        status: 'PENDING',
        run: {
          singleSend: {
            workspaceId,
            campaignGroupId,
            priority: { lt: currentPriority },
          },
          status: { in: ['CREATED', 'AUDIENCE_BUILDING', 'AUDIENCE_READY', 'SENDING'] },
        },
      },
      include: {
        run: {
          include: {
            singleSend: {
              select: { name: true, priority: true },
            },
          },
        },
      },
    });

    if (higherPriorityRecipient) {
      return {
        blocked: true,
        reason: 'collision:lower_priority',
        details: {
          higherPriorityCampaign: higherPriorityRecipient.run.singleSend.name,
        },
      };
    }

    return { blocked: false };
  }

  /**
   * Batch check collisions for multiple recipients
   */
  async batchCheckCollisions(
    workspaceId: string,
    recipients: Array<{ subjectId: string; email: string; vars?: Record<string, any> }>,
    campaignGroupId: string | null,
    collisionWindow: number,
    currentPriority: number,
    collisionPolicy: CollisionPolicy,
  ): Promise<RecipientWithCollision[]> {
    if (!campaignGroupId || collisionPolicy === CollisionPolicy.SEND_ALL) {
      return recipients.map((r) => ({
        ...r,
        collisionResult: { blocked: false },
      }));
    }

    const subjectIds = recipients.map((r) => r.subjectId);
    const windowStart = new Date(Date.now() - collisionWindow * 1000);

    // Batch query for recent sends
    const recentSends = await this.prisma.sendLog.findMany({
      where: {
        workspaceId,
        campaignGroupId,
        subjectId: { in: subjectIds },
        sentAt: { gte: windowStart },
      },
      select: {
        subjectId: true,
        sentAt: true,
      },
    });

    const recentSendMap = new Map<string, Date>();
    for (const send of recentSends) {
      const existing = recentSendMap.get(send.subjectId);
      if (!existing || send.sentAt > existing) {
        recentSendMap.set(send.subjectId, send.sentAt);
      }
    }

    // Batch query for higher-priority pending recipients
    let higherPrioritySet = new Set<string>();
    if (collisionPolicy === CollisionPolicy.HIGHEST_PRIORITY_WINS) {
      const higherPriorityRecipients = await this.prisma.singleSendRecipient.findMany({
        where: {
          subjectId: { in: subjectIds },
          status: 'PENDING',
          run: {
            singleSend: {
              workspaceId,
              campaignGroupId,
              priority: { lt: currentPriority },
            },
            status: { in: ['CREATED', 'AUDIENCE_BUILDING', 'AUDIENCE_READY', 'SENDING'] },
          },
        },
        select: {
          subjectId: true,
        },
      });

      higherPrioritySet = new Set(higherPriorityRecipients.map((r) => r.subjectId));
    }

    // Build results
    return recipients.map((recipient) => {
      const lastSentAt = recentSendMap.get(recipient.subjectId);
      if (lastSentAt) {
        return {
          ...recipient,
          collisionResult: {
            blocked: true,
            reason: 'collision:already_sent',
            details: { lastSentAt },
          },
        };
      }

      if (higherPrioritySet.has(recipient.subjectId)) {
        return {
          ...recipient,
          collisionResult: {
            blocked: true,
            reason: 'collision:lower_priority',
          },
        };
      }

      return {
        ...recipient,
        collisionResult: { blocked: false },
      };
    });
  }

  /**
   * Record a successful send for future collision detection
   */
  async recordSend(
    workspaceId: string,
    subjectId: string,
    campaignGroupId: string,
    singleSendId: string,
  ): Promise<void> {
    await this.prisma.sendLog.create({
      data: {
        workspaceId,
        subjectId,
        campaignGroupId,
        singleSendId,
      },
    });
  }

  /**
   * Final send-time collision check (belt-and-suspenders)
   */
  async checkCollisionAtSendTime(
    workspaceId: string,
    subjectId: string,
    campaignGroupId: string | null,
    collisionWindow: number,
  ): Promise<CollisionCheckResult> {
    return this.checkCollision(workspaceId, subjectId, campaignGroupId, collisionWindow);
  }
}
