import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Processor("campaign")
export class CampaignProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    @InjectQueue("segment") private segmentQueue: Queue
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "triggerCampaign":
        return this.triggerCampaign(job.data?.campaignId);
      default:
        throw new Error(`Unknown job ${job.name}`);
    }
  }

  private async triggerCampaign(campaignId: string) {
    if (!campaignId) throw new BadRequestException("campaignId is required");

    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId },
      select: {
        id: true,
        workspaceId: true,
        segmentId: true,
      },
    });
    if (!campaign) throw new BadRequestException("Campaign not found");

    const run = await this.prisma.campaignRun.create({
      data: {
        campaignId: campaign.id,
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

