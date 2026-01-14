import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { BadRequestException } from "@nestjs/common";
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
      select: { id: true },
    });
    if (!ss) throw new BadRequestException("Single send not found");

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
        jobId: `segment:buildAudienceSnapshot:${run.id}`,
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );

    return { ok: true, runId: run.id };
  }
}

