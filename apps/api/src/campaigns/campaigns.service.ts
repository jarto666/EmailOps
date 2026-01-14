import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { CampaignStatus, ScheduleType } from "@email-ops/core";
import { PrismaService } from "../prisma/prisma.service";

function validateCron(cronExpression: string | undefined, scheduleType: any) {
  if (scheduleType !== ScheduleType.CRON) return;
  if (typeof cronExpression !== "string" || cronExpression.trim().length === 0) {
    throw new BadRequestException("cronExpression is required when scheduleType=CRON.");
  }
  // Minimal check; BullMQ will validate further.
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) {
    throw new BadRequestException("cronExpression must have 5 or 6 fields.");
  }
}

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue("campaign") private campaignQueue: Queue
  ) {}

  private cronJobId(campaignId: string) {
    return `campaign:${campaignId}:cron`;
  }

  private async upsertSchedule(campaign: {
    id: string;
    scheduleType: any;
    cronExpression: string | null;
  }) {
    // Remove existing repeatable job, if any (safe idempotent cleanup).
    const jobId = this.cronJobId(campaign.id);
    const existing = await this.campaignQueue.getRepeatableJobs();
    for (const r of existing) {
      if (r.id === jobId || r.key?.includes(jobId)) {
        try {
          await this.campaignQueue.removeRepeatableByKey(r.key);
        } catch {
          // ignore
        }
      }
    }

    if (campaign.scheduleType !== ScheduleType.CRON) return;
    validateCron(campaign.cronExpression ?? undefined, ScheduleType.CRON);

    await this.campaignQueue.add(
      "triggerCampaign",
      { campaignId: campaign.id },
      {
        jobId,
        repeat: { pattern: campaign.cronExpression as string },
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
  }

  async create(input: {
    workspaceId: string;
    name: string;
    description?: string;
    status?: CampaignStatus;
    templateId: string;
    segmentId: string;
    senderProfileId: string;
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

    // Ensure workspace exists (matches patterns in TemplatesService).
    await this.prisma.workspace.upsert({
      where: { id: input.workspaceId },
      update: {},
      create: { id: input.workspaceId, name: "Default Workspace" },
    });

    // Validate FK refs are in the same workspace (clearer errors than FK violations).
    const [template, segment, senderProfile] = await Promise.all([
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
    ]);
    if (!template) throw new BadRequestException("templateId is invalid for workspace.");
    if (!segment) throw new BadRequestException("segmentId is invalid for workspace.");
    if (!senderProfile)
      throw new BadRequestException("senderProfileId is invalid for workspace.");

    const scheduleType = input.scheduleType ?? ScheduleType.MANUAL;
    validateCron(input.cronExpression, scheduleType);

    const created = await this.prisma.campaign.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? undefined,
        status: input.status ?? CampaignStatus.DRAFT,
        templateId: input.templateId,
        segmentId: input.segmentId,
        senderProfileId: input.senderProfileId,
        scheduleType,
        cronExpression: scheduleType === ScheduleType.CRON ? input.cronExpression : undefined,
        policies: input.policies ?? undefined,
      },
    });

    await this.upsertSchedule(created);
    return created;
  }

  async list(workspaceId: string) {
    return this.prisma.campaign.findMany({
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
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: {
        template: { select: { id: true, name: true, key: true } },
        segment: { select: { id: true, name: true } },
        senderProfile: { select: { id: true, fromEmail: true, fromName: true } },
        runs: { orderBy: { createdAt: "desc" }, take: 25 },
      },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  async update(workspaceId: string, id: string, input: any) {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Campaign not found");

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

    const scheduleType =
      input.scheduleType != null ? input.scheduleType : undefined;
    const cronExpression =
      input.cronExpression != null ? input.cronExpression : undefined;
    validateCron(cronExpression, scheduleType ?? ScheduleType.MANUAL);

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description ?? undefined,
        status: input.status ?? undefined,
        templateId: input.templateId ?? undefined,
        segmentId: input.segmentId ?? undefined,
        senderProfileId: input.senderProfileId ?? undefined,
        scheduleType: scheduleType ?? undefined,
        cronExpression: cronExpression ?? undefined,
        policies: input.policies ?? undefined,
      },
    });

    await this.upsertSchedule(updated);
    return updated;
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Campaign not found");

    // Unschedule any repeatables then delete.
    await this.upsertSchedule({
      id,
      scheduleType: ScheduleType.MANUAL,
      cronExpression: null,
    });

    await this.prisma.campaign.delete({ where: { id } });
    return { ok: true };
  }

  async trigger(workspaceId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
      select: { id: true },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");

    const job = await this.campaignQueue.add(
      "triggerCampaign",
      { campaignId },
      {
        jobId: `campaign:${campaignId}:manual:${Date.now()}`,
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
    return { ok: true, jobId: job.id };
  }
}

