import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { BadRequestException } from "@nestjs/common";
import { SingleSendRunStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Processor("singleSend")
export class SingleSendProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    @InjectQueue("segment") private segmentQueue: Queue
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "triggerSingleSend":
        return this.triggerSingleSend(job.data?.singleSendId);
      default:
        throw new Error(`Unknown job ${job.name}`);
    }
  }

  private async triggerSingleSend(singleSendId: string) {
    if (!singleSendId) throw new BadRequestException("singleSendId is required");

    const ss = await this.prisma.singleSend.findFirst({
      where: { id: singleSendId },
      select: { id: true, status: true },
    });
    if (!ss) throw new BadRequestException("Single send not found");

    // Only process ACTIVE campaigns
    if (ss.status !== "ACTIVE") {
      console.log(`Skipping trigger for campaign ${singleSendId} - status is ${ss.status}, not ACTIVE`);
      return { ok: false, reason: `Campaign status is ${ss.status}, not ACTIVE` };
    }

    // Check for overlapping runs - skip if there's already an active run
    const activeRunStatuses: SingleSendRunStatus[] = [
      SingleSendRunStatus.CREATED,
      SingleSendRunStatus.AUDIENCE_BUILDING,
      SingleSendRunStatus.AUDIENCE_READY,
      SingleSendRunStatus.SENDING,
    ];
    const activeRun = await this.prisma.singleSendRun.findFirst({
      where: {
        singleSendId,
        status: { in: activeRunStatuses },
      },
      select: { id: true, status: true },
    });

    if (activeRun) {
      console.log(`Skipping trigger for campaign ${singleSendId} - already has active run ${activeRun.id} (${activeRun.status})`);
      return { ok: false, reason: `Campaign already has active run (${activeRun.status})` };
    }

    const run = await this.prisma.singleSendRun.create({
      data: {
        singleSendId: ss.id,
        status: "CREATED",
      },
    });

    await this.segmentQueue.add(
      "buildAudienceSnapshot",
      { runId: run.id },
      {
        jobId: `segment-buildAudienceSnapshot-${run.id}`,
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );

    return { ok: true, runId: run.id };
  }
}
