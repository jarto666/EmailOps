import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { BadRequestException } from "@nestjs/common";
import { ConnectorFactory } from "@email-ops/connectors";
import { ConnectorType, EncryptionService } from "@email-ops/core";
import { PrismaService } from "../prisma/prisma.service";

@Processor("segment")
export class SegmentProcessor extends WorkerHost {
  private encryption: EncryptionService;

  constructor(
    private prisma: PrismaService,
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
    switch (job.name) {
      case "dryRunSegment":
        // Execute Query with LIMIT, return count + sample
        return { count: 0, sample: [] };
      case "buildAudienceSnapshot":
        return this.buildAudienceSnapshot(job.data?.runId);
      default:
        throw new Error(`Unknown job ${job.name}`);
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
    if (!runId) throw new BadRequestException("runId is required");

    const run = await this.prisma.campaignRun.findFirst({
      where: { id: runId },
      include: {
        campaign: {
          include: {
            segment: { include: { connector: true } },
          },
        },
      },
    });
    if (!run) throw new BadRequestException("CampaignRun not found");

    const segment = run.campaign?.segment;
    if (!segment) throw new BadRequestException("Campaign has no segment");
    const connector = segment.connector;
    if (!connector) throw new BadRequestException("Segment has no connector");

    await this.prisma.campaignRun.update({
      where: { id: runId },
      data: { status: "AUDIENCE_BUILDING" },
    });

    // Use shared adapters (read-only enforced for Postgres).
    const decrypted = this.decryptConnectorConfig(connector.config);

    // ConnectorFactory currently supports POSTGRES | BIGQUERY.
    const adapterType =
      connector.type === ConnectorType.POSTGRES
        ? "POSTGRES"
        : connector.type === ConnectorType.BIGQUERY
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

      // Bulk insert into RunRecipient with idempotency.
      const batchSize = 500;
      let inserted = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const data = batch
          .map((r) => {
            const recipientId = r?.recipient_id ?? r?.recipientId ?? r?.id;
            const email = r?.email ?? r?.Email ?? r?.email_address;
            let vars = r?.vars ?? r?.variables ?? null;
            if (typeof vars === "string") {
              try {
                vars = JSON.parse(vars);
              } catch {
                // leave as string
              }
            }
            if (!recipientId || !email) return null;
            return {
              runId,
              recipientId: String(recipientId),
              email: String(email),
              vars: vars ?? undefined,
            };
          })
          .filter(Boolean) as any[];

        if (data.length === 0) continue;

        const res = await this.prisma.runRecipient.createMany({
          data,
          skipDuplicates: true,
        });
        inserted += res.count;
      }

      await this.prisma.campaignRun.update({
        where: { id: runId },
        data: {
          status: "AUDIENCE_READY",
          stats: { total: rows.length, inserted },
        },
      });

      // Enqueue sends for all pending recipients (paged).
      await this.prisma.campaignRun.update({
        where: { id: runId },
        data: { status: "SENDING" },
      });

      const pageSize = 500;
      let cursor: string | undefined = undefined;
      let enqueued = 0;

      for (;;) {
        const page: Array<{ id: string }> =
          await this.prisma.runRecipient.findMany({
            where: { runId, status: "PENDING" },
            orderBy: { id: "asc" },
            take: pageSize,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: { id: true },
          });
        if (page.length === 0) break;

        for (const rr of page) {
          await this.sendQueue.add(
            "sendEmail",
            { runRecipientId: rr.id },
            {
              jobId: `send:${rr.id}`,
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

      return { ok: true, total: rows.length, inserted, enqueued };
    } finally {
      await adapter.close();
    }
  }
}
