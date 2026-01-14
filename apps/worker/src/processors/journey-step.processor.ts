import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { BadRequestException } from "@nestjs/common";
import { JourneyNodeType } from "@email-ops/core";
import { PrismaService } from "../prisma/prisma.service";

function msFromDelayConfig(cfg: any): number {
  if (cfg == null) return 0;
  const seconds = cfg.seconds;
  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
    return Math.floor(seconds * 1000);
  }
  const ms = cfg.ms;
  if (typeof ms === "number" && Number.isFinite(ms) && ms > 0) return Math.floor(ms);
  return 0;
}

@Processor("journey")
export class JourneyStepProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    @InjectQueue("journey") private journeyQueue: Queue,
    @InjectQueue("send") private sendQueue: Queue
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "runStep":
        return this.runStep(job.data?.stepExecutionId);
      default:
        // ignore (handled by other journey processors)
        return;
    }
  }

  private async runStep(stepExecutionId: string) {
    if (!stepExecutionId) throw new BadRequestException("stepExecutionId is required");

    const step = await this.prisma.stepExecution.findFirst({
      where: { id: stepExecutionId },
      include: {
        enrollment: {
          include: {
            subject: true,
            journeyVersion: {
              include: { nodes: true, edges: true, journey: true },
            },
          },
        },
      },
    });
    if (!step) throw new BadRequestException("StepExecution not found");

    const v = step.enrollment.journeyVersion;
    const node = v.nodes.find((n) => n.nodeKey === step.nodeKey);
    if (!node) throw new BadRequestException("Node not found for step");

    // Mark running
    await this.prisma.stepExecution.update({
      where: { id: step.id },
      data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
    });

    const cfg: any = node.config ?? {};
    const outgoing = v.edges.filter((e) => e.fromNodeKey === node.nodeKey);
    const nextNodeKey = outgoing[0]?.toNodeKey ?? null;

    try {
      switch (node.type) {
        case JourneyNodeType.DELAY: {
          if (!nextNodeKey) throw new BadRequestException("DELAY node has no outgoing edge");
          const delayMs = msFromDelayConfig(cfg);
          const scheduledAt = new Date(Date.now() + delayMs);

          const next = await this.prisma.stepExecution.upsert({
            where: {
              enrollmentId_nodeKey: {
                enrollmentId: step.enrollmentId,
                nodeKey: nextNodeKey,
              },
            },
            create: {
              enrollmentId: step.enrollmentId,
              nodeKey: nextNodeKey,
              status: "SCHEDULED",
              scheduledAt,
            },
            update: { scheduledAt },
          });

          await this.prisma.stepExecution.update({
            where: { id: step.id },
            data: { status: "COMPLETED", completedAt: new Date() },
          });

          await this.journeyQueue.add(
            "runStep",
            { stepExecutionId: next.id },
            {
              jobId: `journey:step:${next.id}`,
              delay: Math.max(0, scheduledAt.getTime() - Date.now()),
              removeOnComplete: true,
              removeOnFail: 100,
            }
          );
          return { ok: true, type: "DELAY", nextStepId: next.id };
        }

        case JourneyNodeType.SEND_EMAIL: {
          if (!cfg?.templateId || !cfg?.senderProfileId) {
            throw new BadRequestException("SEND_EMAIL node requires config.templateId and config.senderProfileId");
          }
          const to = step.enrollment.subject.email;
          if (!to) throw new BadRequestException("Subject has no email (set via identify/events).");

          const variables = {
            subject: {
              id: step.enrollment.subject.subjectId,
              email: step.enrollment.subject.email,
              traits: step.enrollment.subject.traits,
            },
          };

          // Defer actual delivery to send queue (idempotent by stepExecutionId).
          await this.sendQueue.add(
            "sendJourneyEmail",
            {
              workspaceId: step.enrollment.workspaceId,
              to,
              templateId: String(cfg.templateId),
              senderProfileId: String(cfg.senderProfileId),
              variables,
              idempotencyKey: `journeyStep:${step.id}`,
            },
            {
              jobId: `send:journey:${step.id}`,
              attempts: 5,
              backoff: { type: "exponential", delay: 5_000 },
              removeOnComplete: true,
              removeOnFail: 100,
            }
          );

          await this.prisma.stepExecution.update({
            where: { id: step.id },
            data: { status: "COMPLETED", completedAt: new Date() },
          });

          if (nextNodeKey) {
            const next = await this.prisma.stepExecution.upsert({
              where: {
                enrollmentId_nodeKey: {
                  enrollmentId: step.enrollmentId,
                  nodeKey: nextNodeKey,
                },
              },
              create: {
                enrollmentId: step.enrollmentId,
                nodeKey: nextNodeKey,
                status: "SCHEDULED",
                scheduledAt: new Date(),
              },
              update: {},
            });

            await this.journeyQueue.add(
              "runStep",
              { stepExecutionId: next.id },
              {
                jobId: `journey:step:${next.id}`,
                removeOnComplete: true,
                removeOnFail: 100,
              }
            );
          } else {
            await this.prisma.enrollment.update({
              where: { id: step.enrollmentId },
              data: { status: "COMPLETED", exitedAt: new Date() },
            });
          }

          return { ok: true, type: "SEND_EMAIL" };
        }

        case JourneyNodeType.CONDITION: {
          // MVP: pick first outgoing edge.
          if (!nextNodeKey) throw new BadRequestException("CONDITION node has no outgoing edge");
          const next = await this.prisma.stepExecution.upsert({
            where: {
              enrollmentId_nodeKey: { enrollmentId: step.enrollmentId, nodeKey: nextNodeKey },
            },
            create: {
              enrollmentId: step.enrollmentId,
              nodeKey: nextNodeKey,
              status: "SCHEDULED",
              scheduledAt: new Date(),
            },
            update: {},
          });

          await this.prisma.stepExecution.update({
            where: { id: step.id },
            data: { status: "COMPLETED", completedAt: new Date() },
          });

          await this.journeyQueue.add(
            "runStep",
            { stepExecutionId: next.id },
            { jobId: `journey:step:${next.id}`, removeOnComplete: true, removeOnFail: 100 }
          );
          return { ok: true, type: "CONDITION" };
        }

        case JourneyNodeType.EXIT: {
          await this.prisma.stepExecution.update({
            where: { id: step.id },
            data: { status: "COMPLETED", completedAt: new Date() },
          });
          await this.prisma.enrollment.update({
            where: { id: step.enrollmentId },
            data: { status: "COMPLETED", exitedAt: new Date() },
          });
          return { ok: true, type: "EXIT" };
        }

        default:
          throw new BadRequestException(`Unsupported node type: ${node.type as any}`);
      }
    } catch (e: any) {
      await this.prisma.stepExecution.update({
        where: { id: step.id },
        data: { status: "FAILED", completedAt: new Date(), error: String(e?.message ?? e) },
      });
      await this.prisma.enrollment.update({
        where: { id: step.enrollmentId },
        data: { status: "FAILED", exitedAt: new Date() },
      });
      throw e;
    }
  }
}

