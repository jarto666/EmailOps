import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { SendStatus, SuppressionReason } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SuppressionService } from "../suppression/suppression.service";

// SES Event Types
interface SesEventPayload {
  provider: 'ses';
  type: 'delivery' | 'bounce' | 'complaint';
  messageId: string;
  timestamp: string;
  payload: {
    notificationType: string;
    mail: {
      timestamp: string;
      source: string;
      messageId: string;
      destination: string[];
    };
    bounce?: {
      bounceType: 'Undetermined' | 'Permanent' | 'Transient';
      bounceSubType: string;
      bouncedRecipients: Array<{
        emailAddress: string;
        action?: string;
        status?: string;
        diagnosticCode?: string;
      }>;
      timestamp: string;
    };
    complaint?: {
      complainedRecipients: Array<{
        emailAddress: string;
      }>;
      timestamp: string;
      complaintFeedbackType?: string;
    };
    delivery?: {
      timestamp: string;
      processingTimeMillis: number;
      recipients: string[];
      smtpResponse: string;
    };
  };
}

@Processor("events")
export class EventsProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private suppressionService: SuppressionService
  ) {
    super();
  }

  async process(job: Job<SesEventPayload, any, string>): Promise<any> {
    console.log(`Processing event job ${job.name}`);

    const { provider, type, messageId, payload } = job.data;

    if (provider !== 'ses') {
      console.log(`Unsupported provider: ${provider}`);
      return { processed: false, reason: 'unsupported_provider' };
    }

    switch (type) {
      case 'delivery':
        return this.handleDelivery(messageId, payload);
      case 'bounce':
        return this.handleBounce(messageId, payload);
      case 'complaint':
        return this.handleComplaint(messageId, payload);
      default:
        console.log(`Unknown event type: ${type}`);
        return { processed: false, reason: 'unknown_event_type' };
    }
  }

  private async handleDelivery(messageId: string, payload: SesEventPayload['payload']) {
    console.log(`Processing delivery event for messageId: ${messageId}`);

    // Find the Send record by providerMessageId
    const send = await this.prisma.send.findFirst({
      where: { providerMessageId: messageId },
      include: {
        singleSendRecipient: true,
      },
    });

    if (!send) {
      console.log(`No Send record found for messageId: ${messageId}`);
      return { processed: true, found: false };
    }

    // Update Send status to DELIVERED
    await this.prisma.send.update({
      where: { id: send.id },
      data: { status: SendStatus.DELIVERED },
    });

    console.log(`Marked send ${send.id} as DELIVERED`);
    return { processed: true, sendId: send.id, status: 'delivered' };
  }

  private async handleBounce(messageId: string, payload: SesEventPayload['payload']) {
    console.log(`Processing bounce event for messageId: ${messageId}`);

    const bounce = payload.bounce;
    if (!bounce) {
      console.log('No bounce data in payload');
      return { processed: false, reason: 'no_bounce_data' };
    }

    // Find the Send record by providerMessageId
    const send = await this.prisma.send.findFirst({
      where: { providerMessageId: messageId },
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
      console.log(`No Send record found for messageId: ${messageId}`);
      // Still process the bounce for suppression even without a Send record
    }

    // Update Send status to BOUNCED
    if (send) {
      await this.prisma.send.update({
        where: { id: send.id },
        data: {
          status: SendStatus.BOUNCED,
          lastError: `${bounce.bounceType}: ${bounce.bounceSubType}`,
        },
      });
      console.log(`Marked send ${send.id} as BOUNCED`);
    }

    // Get workspaceId from the send record
    const workspaceId = send?.singleSendRecipient?.run?.singleSend?.workspaceId;

    // Add bounced emails to suppression list (only for hard bounces)
    if (bounce.bounceType === 'Permanent' && workspaceId) {
      for (const recipient of bounce.bouncedRecipients) {
        await this.suppressionService.addSuppressionSilent(
          workspaceId,
          recipient.emailAddress,
          SuppressionReason.BOUNCE
        );
        console.log(`Added ${recipient.emailAddress} to suppression list (hard bounce)`);
      }
    } else if (!workspaceId && bounce.bounceType === 'Permanent') {
      // If we don't have a workspaceId, log for manual review
      console.warn(
        `Hard bounce without workspaceId, manual suppression needed for: ${bounce.bouncedRecipients.map((r) => r.emailAddress).join(', ')}`
      );
    }

    return {
      processed: true,
      sendId: send?.id,
      bounceType: bounce.bounceType,
      suppressedCount: bounce.bounceType === 'Permanent' ? bounce.bouncedRecipients.length : 0,
    };
  }

  private async handleComplaint(messageId: string, payload: SesEventPayload['payload']) {
    console.log(`Processing complaint event for messageId: ${messageId}`);

    const complaint = payload.complaint;
    if (!complaint) {
      console.log('No complaint data in payload');
      return { processed: false, reason: 'no_complaint_data' };
    }

    // Find the Send record by providerMessageId
    const send = await this.prisma.send.findFirst({
      where: { providerMessageId: messageId },
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
      console.log(`No Send record found for messageId: ${messageId}`);
    }

    // Update Send status to COMPLAINT
    if (send) {
      await this.prisma.send.update({
        where: { id: send.id },
        data: {
          status: SendStatus.COMPLAINT,
          lastError: `Complaint: ${complaint.complaintFeedbackType || 'unknown'}`,
        },
      });
      console.log(`Marked send ${send.id} as COMPLAINT`);
    }

    // Get workspaceId from the send record
    const workspaceId = send?.singleSendRecipient?.run?.singleSend?.workspaceId;

    // ALWAYS add complained emails to suppression list - complaints are serious
    if (workspaceId) {
      for (const recipient of complaint.complainedRecipients) {
        await this.suppressionService.addSuppressionSilent(
          workspaceId,
          recipient.emailAddress,
          SuppressionReason.COMPLAINT
        );
        console.log(`Added ${recipient.emailAddress} to suppression list (complaint)`);
      }
    } else {
      // Log for manual review if we don't have workspaceId
      console.warn(
        `Complaint without workspaceId, manual suppression needed for: ${complaint.complainedRecipients.map((r) => r.emailAddress).join(', ')}`
      );
    }

    return {
      processed: true,
      sendId: send?.id,
      complaintType: complaint.complaintFeedbackType,
      suppressedCount: complaint.complainedRecipients.length,
    };
  }
}
