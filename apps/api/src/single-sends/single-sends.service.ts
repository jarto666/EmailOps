import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { CronExpressionParser } from "cron-parser";
import { ScheduleType, SingleSendStatus, SingleSendRunStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

function validateCron(cronExpression: string | undefined, scheduleType: any) {
  if (scheduleType !== ScheduleType.CRON) return;
  if (typeof cronExpression !== "string" || cronExpression.trim().length === 0) {
    throw new BadRequestException("cronExpression is required when scheduleType=CRON.");
  }
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) {
    throw new BadRequestException("cronExpression must have 5 or 6 fields.");
  }

  // Validate the cron expression is parseable
  try {
    CronExpressionParser.parse(cronExpression);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid cron expression";
    throw new BadRequestException(`Invalid cron expression: ${message}`);
  }
}

@Injectable()
export class SingleSendsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue("singleSend") private singleSendQueue: Queue
  ) {}

  private cronJobId(singleSendId: string) {
    return `singleSend-${singleSendId}-cron`;
  }

  private async upsertSchedule(singleSend: {
    id: string;
    status: SingleSendStatus;
    scheduleType: any;
    cronExpression: string | null;
  }) {
    const jobId = this.cronJobId(singleSend.id);
    const existing = await this.singleSendQueue.getRepeatableJobs();
    for (const r of existing) {
      if (r.id === jobId || r.key?.includes(jobId)) {
        try {
          await this.singleSendQueue.removeRepeatableByKey(r.key);
        } catch {
          // ignore
        }
      }
    }

    // Only create CRON schedule if campaign is ACTIVE and schedule type is CRON
    if (singleSend.scheduleType !== ScheduleType.CRON) return;
    if (singleSend.status !== SingleSendStatus.ACTIVE) return;

    validateCron(singleSend.cronExpression ?? undefined, ScheduleType.CRON);

    await this.singleSendQueue.add(
      "triggerSingleSend",
      { singleSendId: singleSend.id },
      {
        jobId,
        repeat: { pattern: singleSend.cronExpression as string },
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
  }

  async create(input: {
    workspaceId: string;
    name: string;
    description?: string;
    status?: SingleSendStatus;
    templateId: string;
    segmentId: string;
    senderProfileId: string;
    campaignGroupId?: string;
    scheduleType?: ScheduleType;
    cronExpression?: string;
    policies?: Record<string, any>;
  }) {
    if (!input.workspaceId || input.workspaceId.trim().length === 0) {
      throw new BadRequestException("workspaceId is required.");
    }
    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestException("name is required.");
    }

    await this.prisma.workspace.upsert({
      where: { id: input.workspaceId },
      update: {},
      create: { id: input.workspaceId, name: "Default Workspace" },
    });

    const [template, segment, senderProfile, campaignGroup] = await Promise.all([
      this.prisma.template.findFirst({
        where: { id: input.templateId, workspaceId: input.workspaceId },
        select: { id: true },
      }),
      this.prisma.segment.findFirst({
        where: { id: input.segmentId, workspaceId: input.workspaceId },
        select: { id: true },
      }),
      this.prisma.senderProfile.findFirst({
        where: { id: input.senderProfileId, workspaceId: input.workspaceId },
        select: { id: true },
      }),
      input.campaignGroupId
        ? this.prisma.campaignGroup.findFirst({
            where: { id: input.campaignGroupId, workspaceId: input.workspaceId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    if (!template) throw new BadRequestException("templateId is invalid for workspace.");
    if (!segment) throw new BadRequestException("segmentId is invalid for workspace.");
    if (!senderProfile)
      throw new BadRequestException("senderProfileId is invalid for workspace.");
    if (input.campaignGroupId && !campaignGroup)
      throw new BadRequestException("campaignGroupId is invalid for workspace.");

    const scheduleType = input.scheduleType ?? ScheduleType.MANUAL;
    validateCron(input.cronExpression, scheduleType);

    const created = await this.prisma.singleSend.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? undefined,
        status: input.status ?? SingleSendStatus.DRAFT,
        templateId: input.templateId,
        segmentId: input.segmentId,
        senderProfileId: input.senderProfileId,
        campaignGroupId: input.campaignGroupId ?? undefined,
        scheduleType,
        cronExpression: scheduleType === ScheduleType.CRON ? input.cronExpression : undefined,
        policies: input.policies ?? undefined,
      },
    });

    await this.upsertSchedule(created);
    return created;
  }

  async list(workspaceId: string) {
    return this.prisma.singleSend.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        template: { select: { id: true, name: true, key: true } },
        segment: { select: { id: true, name: true } },
        senderProfile: { select: { id: true, fromEmail: true, fromName: true } },
      },
    });
  }

  async get(workspaceId: string, id: string) {
    const ss = await this.prisma.singleSend.findFirst({
      where: { id, workspaceId },
      include: {
        template: { select: { id: true, name: true, key: true } },
        segment: { select: { id: true, name: true } },
        senderProfile: { select: { id: true, fromEmail: true, fromName: true } },
        runs: { orderBy: { createdAt: "desc" }, take: 25 },
      },
    });
    if (!ss) throw new NotFoundException("Single send not found");
    return ss;
  }

  async update(workspaceId: string, id: string, input: any) {
    const existing = await this.prisma.singleSend.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Single send not found");

    if (input.templateId) {
      const ok = await this.prisma.template.findFirst({
        where: { id: input.templateId, workspaceId },
        select: { id: true },
      });
      if (!ok) throw new BadRequestException("templateId is invalid for workspace.");
    }
    if (input.segmentId) {
      const ok = await this.prisma.segment.findFirst({
        where: { id: input.segmentId, workspaceId },
        select: { id: true },
      });
      if (!ok) throw new BadRequestException("segmentId is invalid for workspace.");
    }
    if (input.senderProfileId) {
      const ok = await this.prisma.senderProfile.findFirst({
        where: { id: input.senderProfileId, workspaceId },
        select: { id: true },
      });
      if (!ok) throw new BadRequestException("senderProfileId is invalid for workspace.");
    }
    if (input.campaignGroupId) {
      const ok = await this.prisma.campaignGroup.findFirst({
        where: { id: input.campaignGroupId, workspaceId },
        select: { id: true },
      });
      if (!ok) throw new BadRequestException("campaignGroupId is invalid for workspace.");
    }

    const scheduleType = input.scheduleType != null ? input.scheduleType : undefined;
    const cronExpression = input.cronExpression != null ? input.cronExpression : undefined;
    validateCron(cronExpression, scheduleType ?? ScheduleType.MANUAL);

    const updated = await this.prisma.singleSend.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description ?? undefined,
        status: input.status ?? undefined,
        templateId: input.templateId ?? undefined,
        segmentId: input.segmentId ?? undefined,
        senderProfileId: input.senderProfileId ?? undefined,
        campaignGroupId: input.campaignGroupId === null ? null : (input.campaignGroupId ?? undefined),
        scheduleType: scheduleType ?? undefined,
        cronExpression: cronExpression ?? undefined,
        policies: input.policies ?? undefined,
      },
    });

    await this.upsertSchedule(updated);
    return updated;
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.singleSend.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Single send not found");

    await this.upsertSchedule({ id, status: SingleSendStatus.DRAFT, scheduleType: ScheduleType.MANUAL, cronExpression: null });
    await this.prisma.singleSend.delete({ where: { id } });
    return { ok: true };
  }

  async trigger(workspaceId: string, singleSendId: string) {
    const ss = await this.prisma.singleSend.findFirst({
      where: { id: singleSendId, workspaceId },
      select: { id: true, status: true },
    });
    if (!ss) throw new NotFoundException("Single send not found");

    if (ss.status !== SingleSendStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot trigger campaign with status ${ss.status}. Only ACTIVE campaigns can be triggered.`
      );
    }

    // Check for overlapping runs - prevent triggering if there's already an active run
    const activeRunStatuses = [
      SingleSendRunStatus.CREATED,
      SingleSendRunStatus.AUDIENCE_BUILDING,
      SingleSendRunStatus.AUDIENCE_READY,
      SingleSendRunStatus.SENDING,
    ];

    // Auto-timeout: mark runs older than 30 minutes as FAILED
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);
    await this.prisma.singleSendRun.updateMany({
      where: {
        singleSendId,
        status: { in: activeRunStatuses },
        createdAt: { lt: staleThreshold },
      },
      data: {
        status: SingleSendRunStatus.FAILED,
        completedAt: new Date(),
        stats: { error: "Timed out - no worker processed this run" },
      },
    });

    const activeRun = await this.prisma.singleSendRun.findFirst({
      where: {
        singleSendId,
        status: { in: activeRunStatuses },
      },
      select: { id: true, status: true, createdAt: true },
    });

    if (activeRun) {
      throw new BadRequestException(
        `Campaign already has an active run (${activeRun.status}). Wait for it to complete before triggering again.`
      );
    }

    const job = await this.singleSendQueue.add(
      "triggerSingleSend",
      { singleSendId },
      {
        jobId: `singleSend-${singleSendId}-manual-${Date.now()}`,
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
    return { ok: true, jobId: job.id };
  }

  /**
   * Clean up stale runs that have been stuck for more than the specified minutes.
   * Marks them as FAILED so new runs can be triggered.
   */
  async cleanupStaleRuns(workspaceId: string, staleMinutes = 30) {
    const activeRunStatuses = [
      SingleSendRunStatus.CREATED,
      SingleSendRunStatus.AUDIENCE_BUILDING,
      SingleSendRunStatus.AUDIENCE_READY,
      SingleSendRunStatus.SENDING,
    ];

    const staleThreshold = new Date(Date.now() - staleMinutes * 60 * 1000);

    // Get campaign IDs for this workspace
    const campaigns = await this.prisma.singleSend.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const campaignIds = campaigns.map((c) => c.id);

    const result = await this.prisma.singleSendRun.updateMany({
      where: {
        singleSendId: { in: campaignIds },
        status: { in: activeRunStatuses },
        createdAt: { lt: staleThreshold },
      },
      data: {
        status: SingleSendRunStatus.FAILED,
        completedAt: new Date(),
        stats: { error: `Timed out after ${staleMinutes} minutes - no worker processed this run` },
      },
    });

    return { ok: true, cleanedUp: result.count };
  }
}

