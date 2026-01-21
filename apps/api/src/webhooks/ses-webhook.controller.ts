import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// SNS Message Types
interface SnsMessage {
  Type: 'SubscriptionConfirmation' | 'Notification' | 'UnsubscribeConfirmation';
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string; // For SubscriptionConfirmation
  UnsubscribeURL?: string; // For Notification
  Subject?: string;
}

// SES Event Types (within SNS Message)
interface SesNotification {
  notificationType: 'Bounce' | 'Complaint' | 'Delivery';
  mail: SesMail;
  bounce?: SesBounce;
  complaint?: SesComplaint;
  delivery?: SesDelivery;
}

interface SesMail {
  timestamp: string;
  source: string;
  sourceArn: string;
  sendingAccountId: string;
  messageId: string;
  destination: string[];
  headersTruncated: boolean;
  headers: Array<{ name: string; value: string }>;
  commonHeaders: {
    from: string[];
    to: string[];
    subject: string;
    messageId: string;
  };
}

interface SesBounce {
  bounceType: 'Undetermined' | 'Permanent' | 'Transient';
  bounceSubType: string;
  bouncedRecipients: Array<{
    emailAddress: string;
    action?: string;
    status?: string;
    diagnosticCode?: string;
  }>;
  timestamp: string;
  feedbackId: string;
  remoteMtaIp?: string;
  reportingMTA?: string;
}

interface SesComplaint {
  complainedRecipients: Array<{
    emailAddress: string;
  }>;
  timestamp: string;
  feedbackId: string;
  complaintSubType?: string;
  complaintFeedbackType?: 'abuse' | 'auth-failure' | 'fraud' | 'not-spam' | 'other' | 'virus';
  userAgent?: string;
  arrivalDate?: string;
}

interface SesDelivery {
  timestamp: string;
  processingTimeMillis: number;
  recipients: string[];
  smtpResponse: string;
  reportingMTA: string;
  remoteMtaIp?: string;
}

@ApiTags('webhooks')
@Controller('webhooks')
export class SesWebhookController {
  private readonly logger = new Logger(SesWebhookController.name);

  constructor(
    @InjectQueue('events') private eventsQueue: Queue,
    private prisma: PrismaService
  ) {}

  @Post('ses/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle SES SNS notifications (bounce, complaint, delivery)' })
  @ApiParam({ name: 'token', description: 'Webhook token from email connector configuration' })
  async handleSesEvent(
    @Param('token') token: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>
  ) {
    // Validate the webhook token belongs to an SES connector
    const connector = await this.prisma.emailProviderConnector.findFirst({
      where: { webhookToken: token, type: 'SES' },
      select: { id: true, name: true, workspaceId: true },
    });

    if (!connector) {
      this.logger.warn(`Invalid webhook token received: ${token.substring(0, 8)}...`);
      throw new NotFoundException('Invalid webhook token');
    }

    this.logger.log(`Webhook received for connector: ${connector.name} (${connector.id})`);
    // SNS sends JSON with content-type: text/plain, so we need to parse
    let snsMessage: SnsMessage;
    try {
      snsMessage = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (e) {
      this.logger.error('Failed to parse SNS message', e);
      return { ok: false, error: 'Invalid JSON' };
    }

    this.logger.log(`Received SNS message type: ${snsMessage.Type}`);

    // Handle different SNS message types
    switch (snsMessage.Type) {
      case 'SubscriptionConfirmation':
        return this.handleSubscriptionConfirmation(snsMessage);

      case 'Notification':
        return this.handleNotification(snsMessage, connector);

      case 'UnsubscribeConfirmation':
        this.logger.log(`SNS unsubscribe confirmation for topic: ${snsMessage.TopicArn}`);
        return { ok: true };

      default:
        this.logger.warn(`Unknown SNS message type: ${(snsMessage as any).Type}`);
        return { ok: true };
    }
  }

  private async handleSubscriptionConfirmation(snsMessage: SnsMessage) {
    // Auto-confirm SNS subscription by visiting the SubscribeURL
    if (snsMessage.SubscribeURL) {
      this.logger.log(`Confirming SNS subscription for topic: ${snsMessage.TopicArn}`);
      try {
        await fetch(snsMessage.SubscribeURL);
        this.logger.log('SNS subscription confirmed successfully');
        return { ok: true, confirmed: true };
      } catch (e) {
        this.logger.error('Failed to confirm SNS subscription', e);
        return { ok: false, error: 'Failed to confirm subscription' };
      }
    }
    return { ok: true };
  }

  private async handleNotification(
    snsMessage: SnsMessage,
    connector: { id: string; name: string; workspaceId: string }
  ) {
    // Parse the SES notification from the SNS Message
    let sesNotification: SesNotification;
    try {
      sesNotification = JSON.parse(snsMessage.Message);
    } catch (e) {
      this.logger.error('Failed to parse SES notification from SNS message', e);
      return { ok: false, error: 'Invalid SES notification' };
    }

    const { notificationType, mail } = sesNotification;
    this.logger.log(
      `SES ${notificationType} event for messageId: ${mail.messageId} (connector: ${connector.name})`
    );

    // Enqueue the event for async processing
    const jobData = {
      provider: 'ses',
      type: notificationType.toLowerCase(),
      messageId: mail.messageId,
      timestamp: mail.timestamp,
      payload: sesNotification,
      connectorId: connector.id,
      workspaceId: connector.workspaceId,
    };

    await this.eventsQueue.add(
      `ses:${notificationType.toLowerCase()}`,
      jobData,
      {
        jobId: `ses-${notificationType.toLowerCase()}-${mail.messageId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      }
    );

    this.logger.log(`Enqueued ${notificationType} event for processing`);

    return { ok: true, type: notificationType, messageId: mail.messageId };
  }
}
