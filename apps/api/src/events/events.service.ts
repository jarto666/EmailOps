import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/encryption.service";

function parseEpochMs(v: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  // seconds vs ms heuristic
  return n > 1e12 ? Math.trunc(n) : Math.trunc(n * 1000);
}

function toHexHmac(secret: string, message: Buffer | string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

@Injectable()
export class EventsService {
  private encryption: EncryptionService;

  constructor(
    private prisma: PrismaService,
    @InjectQueue("journey") private journeyQueue: Queue
  ) {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) {
      throw new Error(
        "ENCRYPTION_SECRET is required to store ingest API key secrets securely."
      );
    }
    this.encryption = new EncryptionService(secret);
  }

  async createIngestKey(workspaceId: string, name?: string) {
    if (!workspaceId || workspaceId.trim().length === 0) {
      throw new BadRequestException("workspaceId is required.");
    }

    await this.prisma.workspace.upsert({
      where: { id: workspaceId },
      update: {},
      create: { id: workspaceId, name: "Default Workspace" },
    });

    const rawSecret = randomBytes(32).toString("hex");
    const created = await this.prisma.ingestApiKey.create({
      data: {
        workspaceId,
        name: name?.trim()?.length ? name.trim() : "default",
        secret: { encrypted: this.encryption.encrypt(rawSecret) },
      },
      select: { id: true, name: true, createdAt: true },
    });

    return { id: created.id, name: created.name, secret: rawSecret };
  }

  async verifySignatureOrThrow(input: {
    workspaceId: string;
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }) {
    const keyId = String(input.headers["x-emailops-key-id"] ?? "");
    const ts = String(input.headers["x-emailops-timestamp"] ?? "");
    const sig = String(input.headers["x-emailops-signature"] ?? "");

    if (!keyId) throw new UnauthorizedException("Missing x-emailops-key-id");
    if (!ts) throw new UnauthorizedException("Missing x-emailops-timestamp");
    if (!sig) throw new UnauthorizedException("Missing x-emailops-signature");

    const tsMs = parseEpochMs(ts);
    if (!Number.isFinite(tsMs))
      throw new UnauthorizedException("Invalid timestamp");
    const now = Date.now();
    const skewMs = Math.abs(now - tsMs);
    const maxSkewMs = 5 * 60 * 1000;
    if (skewMs > maxSkewMs) {
      throw new UnauthorizedException("Timestamp outside allowed window");
    }

    const key = await this.prisma.ingestApiKey.findFirst({
      where: { id: keyId, workspaceId: input.workspaceId },
      select: { id: true, secret: true },
    });
    if (!key) throw new UnauthorizedException("Invalid ingest key");

    const encrypted = (key.secret as any)?.encrypted;
    if (typeof encrypted !== "string" || encrypted.length === 0) {
      throw new UnauthorizedException("Invalid ingest key secret");
    }
    const secret = this.encryption.decrypt(encrypted);

    const expected = toHexHmac(
      secret,
      Buffer.concat([Buffer.from(ts), Buffer.from("."), input.rawBody])
    );
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException("Invalid signature");
    }

    await this.prisma.ingestApiKey.update({
      where: { id: keyId },
      data: { lastUsedAt: new Date() },
    });
  }

  async identify(input: {
    workspaceId: string;
    subjectId: string;
    idempotencyKey: string;
    traits?: Record<string, any>;
    email?: string;
  }) {
    const subject = await this.prisma.subject.upsert({
      where: {
        workspaceId_subjectId: {
          workspaceId: input.workspaceId,
          subjectId: input.subjectId,
        },
      },
      update: {
        email: input.email ?? undefined,
        traits: input.traits ?? undefined,
      },
      create: {
        workspaceId: input.workspaceId,
        subjectId: input.subjectId,
        email: input.email ?? undefined,
        traits: input.traits ?? undefined,
      },
    });

    // Store identify as an event for auditing + potential triggers.
    try {
      const e = await this.prisma.event.create({
        data: {
          workspaceId: input.workspaceId,
          subjectPkId: subject.id,
          name: "$identify",
          occurredAt: new Date(),
          properties: input.traits ?? undefined,
          idempotencyKey: input.idempotencyKey,
        },
      });
      await this.journeyQueue.add(
        "processEvent",
        { eventId: e.id },
        {
          jobId: `journey:processEvent:${e.id}`,
          removeOnComplete: true,
          removeOnFail: 100,
        }
      );
    } catch (e: any) {
      // Ignore duplicates
      if (
        String(e?.message ?? "").includes(
          "Event_workspaceId_idempotencyKey_key"
        )
      ) {
        return { ok: true, duplicate: true };
      }
      throw e;
    }

    return { ok: true };
  }

  async track(input: {
    workspaceId: string;
    subjectId: string;
    name: string;
    idempotencyKey: string;
    occurredAt?: Date;
    properties?: Record<string, any>;
    email?: string;
  }) {
    const subject = await this.prisma.subject.upsert({
      where: {
        workspaceId_subjectId: {
          workspaceId: input.workspaceId,
          subjectId: input.subjectId,
        },
      },
      update: { email: input.email ?? undefined },
      create: {
        workspaceId: input.workspaceId,
        subjectId: input.subjectId,
        email: input.email ?? undefined,
      },
    });

    try {
      const e = await this.prisma.event.create({
        data: {
          workspaceId: input.workspaceId,
          subjectPkId: subject.id,
          name: input.name,
          occurredAt: input.occurredAt ?? new Date(),
          properties: input.properties ?? undefined,
          idempotencyKey: input.idempotencyKey,
        },
      });
      await this.journeyQueue.add(
        "processEvent",
        { eventId: e.id },
        {
          jobId: `journey:processEvent:${e.id}`,
          removeOnComplete: true,
          removeOnFail: 100,
        }
      );
    } catch (e: any) {
      if (
        String(e?.message ?? "").includes(
          "Event_workspaceId_idempotencyKey_key"
        )
      ) {
        return { ok: true, duplicate: true };
      }
      throw e;
    }

    return { ok: true };
  }
}
