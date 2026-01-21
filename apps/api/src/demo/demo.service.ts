import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SendStatus, SuppressionReason } from "@prisma/client";

@Injectable()
export class DemoService {
  constructor(private prisma: PrismaService) {}

  isDemoMode(): boolean {
    return process.env.DEMO_MODE === "true";
  }

  private checkDemoMode() {
    if (!this.isDemoMode()) {
      throw new BadRequestException(
        "Demo mode is not enabled. Set DEMO_MODE=true to use demo features."
      );
    }
  }

  async listRecentSends(workspaceId: string, limit: number = 50) {
    this.checkDemoMode();

    const sends = await this.prisma.send.findMany({
      where: {
        singleSendRecipient: {
          run: {
            singleSend: {
              workspaceId,
            },
          },
        },
      },
      include: {
        singleSendRecipient: {
          select: {
            email: true,
            subjectId: true,
            run: {
              select: {
                singleSend: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return sends.map((send) => ({
      id: send.id,
      email: send.singleSendRecipient?.email ?? "unknown",
      subjectId: send.singleSendRecipient?.subjectId ?? "unknown",
      status: send.status,
      campaignName: send.singleSendRecipient?.run?.singleSend?.name ?? "unknown",
      campaignId: send.singleSendRecipient?.run?.singleSend?.id ?? null,
      createdAt: send.createdAt,
      providerMessageId: send.providerMessageId,
    }));
  }

  async simulateDelivery(sendId: string) {
    this.checkDemoMode();

    const send = await this.prisma.send.findUnique({
      where: { id: sendId },
      include: {
        singleSendRecipient: true,
      },
    });

    if (!send) {
      throw new NotFoundException("Send not found");
    }

    if (send.status !== SendStatus.SENT) {
      throw new BadRequestException(
        `Cannot simulate delivery for send with status: ${send.status}. Must be SENT.`
      );
    }

    await this.prisma.send.update({
      where: { id: sendId },
      data: { status: SendStatus.DELIVERED },
    });

    return {
      ok: true,
      event: "delivery",
      sendId,
      email: send.singleSendRecipient?.email,
      newStatus: SendStatus.DELIVERED,
    };
  }

  async simulateBounce(sendId: string, bounceType: "hard" | "soft" = "hard") {
    this.checkDemoMode();

    const send = await this.prisma.send.findUnique({
      where: { id: sendId },
      include: {
        singleSendRecipient: {
          include: {
            run: {
              include: {
                singleSend: true,
              },
            },
          },
        },
      },
    });

    if (!send) {
      throw new NotFoundException("Send not found");
    }

    if (send.status !== SendStatus.SENT && send.status !== SendStatus.DELIVERED) {
      throw new BadRequestException(
        `Cannot simulate bounce for send with status: ${send.status}. Must be SENT or DELIVERED.`
      );
    }

    const email = send.singleSendRecipient?.email;
    const workspaceId = send.singleSendRecipient?.run?.singleSend?.workspaceId;

    if (!email || !workspaceId) {
      throw new BadRequestException("Could not determine email or workspace");
    }

    // Update send status
    await this.prisma.send.update({
      where: { id: sendId },
      data: {
        status: SendStatus.BOUNCED,
        lastError: `Simulated ${bounceType} bounce`,
      },
    });

    // For hard bounces, add to suppression list
    let suppressionAdded = false;
    if (bounceType === "hard") {
      await this.prisma.suppression.upsert({
        where: {
          workspaceId_email: { workspaceId, email: email.toLowerCase() },
        },
        create: {
          workspaceId,
          email: email.toLowerCase(),
          reason: SuppressionReason.BOUNCE,
        },
        update: {
          reason: SuppressionReason.BOUNCE,
        },
      });
      suppressionAdded = true;
    }

    return {
      ok: true,
      event: "bounce",
      bounceType,
      sendId,
      email,
      newStatus: SendStatus.BOUNCED,
      suppressionAdded,
    };
  }

  async simulateComplaint(sendId: string) {
    this.checkDemoMode();

    const send = await this.prisma.send.findUnique({
      where: { id: sendId },
      include: {
        singleSendRecipient: {
          include: {
            run: {
              include: {
                singleSend: true,
              },
            },
          },
        },
      },
    });

    if (!send) {
      throw new NotFoundException("Send not found");
    }

    if (
      send.status !== SendStatus.SENT &&
      send.status !== SendStatus.DELIVERED
    ) {
      throw new BadRequestException(
        `Cannot simulate complaint for send with status: ${send.status}. Must be SENT or DELIVERED.`
      );
    }

    const email = send.singleSendRecipient?.email;
    const workspaceId = send.singleSendRecipient?.run?.singleSend?.workspaceId;

    if (!email || !workspaceId) {
      throw new BadRequestException("Could not determine email or workspace");
    }

    // Update send status
    await this.prisma.send.update({
      where: { id: sendId },
      data: {
        status: SendStatus.COMPLAINT,
        lastError: "Simulated spam complaint",
      },
    });

    // Always add complaints to suppression list
    await this.prisma.suppression.upsert({
      where: {
        workspaceId_email: { workspaceId, email: email.toLowerCase() },
      },
      create: {
        workspaceId,
        email: email.toLowerCase(),
        reason: SuppressionReason.COMPLAINT,
      },
      update: {
        reason: SuppressionReason.COMPLAINT,
      },
    });

    return {
      ok: true,
      event: "complaint",
      sendId,
      email,
      newStatus: SendStatus.COMPLAINT,
      suppressionAdded: true,
    };
  }
}
