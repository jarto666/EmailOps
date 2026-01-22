import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { BadRequestException } from "@nestjs/common";
import { ConnectorFactory } from "../lib/connectors";
import { EncryptionService } from "../lib/encryption";
import { DataConnectorType, SingleSendRunStatus } from "@prisma/client";
import { CollisionPolicy, RecipientStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CollisionService } from "./services/collision.service";
import { SuppressionService } from "../suppression/suppression.service";

@Processor("segment")
export class SegmentProcessor extends WorkerHost {
  private encryption: EncryptionService;

  constructor(
    private prisma: PrismaService,
    private collisionService: CollisionService,
    private suppressionService: SuppressionService,
    @InjectQueue("send") private sendQueue: Queue
  ) {
    super();
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) {
      throw new Error(
        "ENCRYPTION_SECRET is required to decrypt connector credentials."
      );
    }
    this.encryption = new EncryptionService(secret);
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing segment job ${job.name}`);
    try {
      switch (job.name) {
        case "dryRunSegment":
          // Execute Query with LIMIT, return count + sample
          return { count: 0, sample: [] };
        case "buildAudienceSnapshot":
          return await this.buildAudienceSnapshot(job.data?.runId);
        default:
          throw new Error(`Unknown job ${job.name}`);
      }
    } catch (error) {
      console.error(`Segment job ${job.name} failed:`, error);
      throw error;
    }
  }

  private decryptConnectorConfig(configJson: any): Record<string, any> {
    const encrypted = configJson?.encrypted;
    if (typeof encrypted !== "string" || encrypted.length === 0) {
      throw new BadRequestException(
        "Connector config is missing/invalid. Re-create the connector."
      );
    }
    const plaintext = this.encryption.decrypt(encrypted);
    try {
      return JSON.parse(plaintext);
    } catch {
      throw new BadRequestException(
        "Connector config could not be parsed. Re-create the connector."
      );
    }
  }

  private async buildAudienceSnapshot(runId: string) {
    console.log(`buildAudienceSnapshot starting for runId: ${runId}`);
    if (!runId) throw new BadRequestException("runId is required");

    const run = await this.prisma.singleSendRun.findFirst({
      where: { id: runId },
      include: {
        singleSend: {
          include: {
            segment: { include: { dataConnector: true } },
            campaignGroup: true,
          },
        },
      },
    });
    if (!run) throw new BadRequestException("SingleSendRun not found");

    const singleSend = run.singleSend;
    if (!singleSend) throw new BadRequestException("SingleSend not found");
    const segment = singleSend.segment;
    if (!segment) throw new BadRequestException("SingleSend has no segment");
    const connector = segment.dataConnector;
    if (!connector) throw new BadRequestException("Segment has no connector");

    // Get collision configuration
    const campaignGroup = singleSend.campaignGroup;
    const campaignGroupId = singleSend.campaignGroupId;
    const collisionWindow = campaignGroup?.collisionWindow ?? 86400;
    const collisionPolicy = campaignGroup?.collisionPolicy ?? CollisionPolicy.SEND_ALL;
    const priority = singleSend.priority ?? 100;
    const workspaceId = singleSend.workspaceId;

    await this.prisma.singleSendRun.update({
      where: { id: runId },
      data: { status: SingleSendRunStatus.AUDIENCE_BUILDING },
    });
    console.log(`Run ${runId} status updated to AUDIENCE_BUILDING`);

    // Use shared adapters (read-only enforced for Postgres).
    console.log(`Decrypting connector config...`);
    const decrypted = this.decryptConnectorConfig(connector.config);
    console.log(`Connector config decrypted for ${connector.type} connector`);

    // ConnectorFactory currently supports POSTGRES | BIGQUERY.
    const adapterType =
      connector.type === DataConnectorType.POSTGRES
        ? "POSTGRES"
        : connector.type === DataConnectorType.BIGQUERY
          ? "BIGQUERY"
          : null;
    if (!adapterType) {
      throw new BadRequestException(
        `buildAudienceSnapshot not implemented for connector type: ${connector.type}`
      );
    }

    const adapter = ConnectorFactory.getConnector(adapterType, {
      ...decrypted,
      statementTimeoutMs: 30_000,
    });

    try {
      const rows = await adapter.query<any>(segment.sqlQuery);
      const singleSendId = run.singleSendId;

      // Get all subjectIds that have already been sent to in previous runs for this campaign
      // This ensures we don't send the same campaign to the same person multiple times
      const previouslySent = await this.prisma.singleSendRecipient.findMany({
        where: {
          run: { singleSendId },
          status: RecipientStatus.SENT,
        },
        select: { subjectId: true },
      });
      const alreadySentSubjectIds = new Set(previouslySent.map(r => r.subjectId));
      console.log(`Found ${alreadySentSubjectIds.size} recipients already sent for campaign ${singleSendId}`);

      // Process rows and build recipients list
      const batchSize = 500;
      let inserted = 0;
      let skippedDedup = 0;
      let skippedCollision = 0;
      let skippedSuppression = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        // Parse recipients from batch
        const parsedRecipients = batch
          .map((r) => {
            const subjectId =
              r?.subject_id ??
              r?.subjectId ??
              r?.recipient_id ??
              r?.recipientId ??
              r?.id;
            const email = r?.email ?? r?.Email ?? r?.email_address;
            let vars = r?.vars ?? r?.variables ?? null;
            if (typeof vars === "string") {
              try {
                vars = JSON.parse(vars);
              } catch {
                // leave as string
              }
            }
            if (!subjectId || !email) return null;

            const subjectIdStr = String(subjectId);
            // Skip if this subject has already received this campaign
            if (alreadySentSubjectIds.has(subjectIdStr)) {
              skippedDedup++;
              return null;
            }

            return {
              subjectId: subjectIdStr,
              email: String(email),
              vars: vars ?? undefined,
            };
          })
          .filter(Boolean) as Array<{ subjectId: string; email: string; vars?: any }>;

        if (parsedRecipients.length === 0) continue;

        // Check suppressions for this batch
        const emails = parsedRecipients.map((r) => r.email);
        const suppressionMap = await this.suppressionService.batchCheckSuppressionsMap(
          workspaceId,
          emails
        );

        // Check collisions for this batch
        const recipientsWithCollision = await this.collisionService.batchCheckCollisions(
          workspaceId,
          parsedRecipients,
          campaignGroupId,
          collisionWindow,
          priority,
          collisionPolicy
        );

        // Build data for insertion, marking skipped recipients
        const dataToInsert: Array<{
          runId: string;
          subjectId: string;
          email: string;
          vars?: any;
          status: RecipientStatus;
          skipReason?: string;
        }> = [];

        for (const recipient of recipientsWithCollision) {
          const suppressionReason = suppressionMap.get(recipient.email.toLowerCase());

          if (suppressionReason) {
            // Suppressed - insert with SKIPPED status
            dataToInsert.push({
              runId,
              subjectId: recipient.subjectId,
              email: recipient.email,
              vars: recipient.vars,
              status: RecipientStatus.SKIPPED,
              skipReason: `suppression:${suppressionReason.toLowerCase()}`,
            });
            skippedSuppression++;
          } else if (recipient.collisionResult.blocked) {
            // Collision - insert with SKIPPED status
            dataToInsert.push({
              runId,
              subjectId: recipient.subjectId,
              email: recipient.email,
              vars: recipient.vars,
              status: RecipientStatus.SKIPPED,
              skipReason: recipient.collisionResult.reason,
            });
            skippedCollision++;
          } else {
            // Good to send - insert with PENDING status
            dataToInsert.push({
              runId,
              subjectId: recipient.subjectId,
              email: recipient.email,
              vars: recipient.vars,
              status: RecipientStatus.PENDING,
            });
          }
        }

        if (dataToInsert.length === 0) continue;

        const res = await this.prisma.singleSendRecipient.createMany({
          data: dataToInsert,
          skipDuplicates: true,
        });
        inserted += res.count;
      }

      const totalSkipped = skippedDedup + skippedCollision + skippedSuppression;
      console.log(
        `Audience built: ${rows.length} from query, ` +
        `${skippedDedup} skipped (already sent), ` +
        `${skippedCollision} skipped (collision), ` +
        `${skippedSuppression} skipped (suppression), ` +
        `${inserted} inserted`
      );

      await this.prisma.singleSendRun.update({
        where: { id: runId },
        data: {
          status: SingleSendRunStatus.AUDIENCE_READY,
          stats: {
            total: rows.length,
            inserted,
            skippedReasons: {
              alreadySent: skippedDedup,
              collision: skippedCollision,
              suppression: skippedSuppression,
            },
          },
        },
      });

      // Enqueue sends for all pending recipients (paged).
      await this.prisma.singleSendRun.update({
        where: { id: runId },
        data: { status: SingleSendRunStatus.SENDING },
      });

      const pageSize = 500;
      let cursor: string | undefined = undefined;
      let enqueued = 0;

      for (;;) {
        const page: Array<{ id: string }> =
          await this.prisma.singleSendRecipient.findMany({
            where: { runId, status: RecipientStatus.PENDING },
            orderBy: { id: "asc" },
            take: pageSize,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: { id: true },
          });
        if (page.length === 0) break;

        for (const rr of page) {
          await this.sendQueue.add(
            "sendEmail",
            { singleSendRecipientId: rr.id },
            {
              jobId: `send-${rr.id}`,
              attempts: 5,
              backoff: { type: "exponential", delay: 5_000 },
              removeOnComplete: true,
              removeOnFail: 100,
            }
          );
          enqueued += 1;
        }

        cursor = page[page.length - 1]?.id;
      }

      // If no recipients were enqueued (all were already sent/skipped), mark run as completed
      if (enqueued === 0) {
        console.log(`No new recipients to send for run ${runId}, marking as COMPLETED`);
        await this.prisma.singleSendRun.update({
          where: { id: runId },
          data: {
            status: SingleSendRunStatus.COMPLETED,
            completedAt: new Date(),
            stats: {
              total: rows.length,
              inserted,
              sent: 0,
              failed: 0,
              skipped: skippedCollision + skippedSuppression,
              skippedReasons: {
                alreadySent: skippedDedup,
                collision: skippedCollision,
                suppression: skippedSuppression,
              },
            },
          },
        });
      }

      return {
        ok: true,
        total: rows.length,
        inserted,
        skippedDedup,
        skippedCollision,
        skippedSuppression,
        enqueued,
      };
    } finally {
      await adapter.close();
    }
  }
}
