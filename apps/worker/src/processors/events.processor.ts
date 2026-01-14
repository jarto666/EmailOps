import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

@Processor("events")
export class EventsProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing event job ${job.name}`);
    // Logic: Parse SNS payload, update Send status / Suppression table
    return { processed: true };
  }
}
