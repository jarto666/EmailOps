import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { BadRequestException } from "@nestjs/common";
import { JourneyNodeType } from "@email-ops/core";
import { PrismaService } from "../prisma/prisma.service";

@Processor("journey")
export class JourneyEnrollmentProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    @InjectQueue("journey") private journeyQueue: Queue
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "processEvent":
        return this.processEvent(job.data?.eventId);
      default:
        // let other processors handle other job names
        return;
    }
  }

  private async processEvent(eventId: string) {
    if (!eventId) throw new BadRequestException("eventId is required");

    const event = await this.prisma.event.findFirst({
      where: { id: eventId },
      include: { subject: true },
    });
    if (!event) throw new BadRequestException("Event not found");

    // Find published journey versions in the same workspace with an ENTRY_EVENT node matching event.name.
    const versions = await this.prisma.journeyVersion.findMany({
      where: {
        journey: { workspaceId: event.workspaceId },
        publishedAt: { not: null },
        nodes: {
          some: {
            type: JourneyNodeType.ENTRY_EVENT,
          },
        },
      },
      include: {
        nodes: true,
        edges: true,
        journey: true,
      },
    });

    const matched = versions.filter((v) => {
      const entry = v.nodes.find((n) => n.type === JourneyNodeType.ENTRY_EVENT);
      if (!entry) return false;
      const cfg: any = entry.config ?? {};
      const eventName = cfg?.eventName;
      return typeof eventName === "string" && eventName === event.name;
    });

    let enrolled = 0;

    for (const v of matched) {
      const entry = v.nodes.find((n) => n.type === JourneyNodeType.ENTRY_EVENT)!;
      const outgoing = v.edges.filter((e) => e.fromNodeKey === entry.nodeKey);
      const nextNodeKey = outgoing[0]?.toNodeKey;
      if (!nextNodeKey) continue;

      const dedupeKey = `${event.name}:${event.subject.subjectId}`;

      const enrollment = await this.prisma.enrollment.upsert({
        where: {
          journeyVersionId_dedupeKey: { journeyVersionId: v.id, dedupeKey },
        },
        create: {
          journeyVersionId: v.id,
          workspaceId: event.workspaceId,
          subjectPkId: event.subjectPkId,
          dedupeKey,
        },
        update: {},
      });

      // Create the first step and enqueue it.
      const step = await this.prisma.stepExecution.upsert({
        where: {
          enrollmentId_nodeKey: { enrollmentId: enrollment.id, nodeKey: nextNodeKey },
        },
        create: {
          enrollmentId: enrollment.id,
          nodeKey: nextNodeKey,
          status: "SCHEDULED",
          scheduledAt: new Date(),
        },
        update: {},
      });

      await this.journeyQueue.add(
        "runStep",
        { stepExecutionId: step.id },
        {
          jobId: `journey:step:${step.id}`,
          removeOnComplete: true,
          removeOnFail: 100,
        }
      );

      enrolled += 1;
    }

    return { ok: true, matched: matched.length, enrolled };
  }
}

