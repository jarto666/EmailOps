import { Body, Controller, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { EventsService } from "./events.service";
import {
  CreateIngestKeyDto,
  IdentifyDto,
  TrackEventDto,
} from "./dto/events.dto";

@Controller()
export class EventsController {
  constructor(private events: EventsService) {}

  @Post("events/keys")
  async createKey(@Req() req: Request, @Body() dto: CreateIngestKeyDto) {
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret) {
      const provided = String(req.headers["x-admin-secret"] ?? "");
      if (!provided || provided !== adminSecret) {
        // Intentionally vague
        throw new Error("Unauthorized");
      }
    }
    return this.events.createIngestKey(dto.workspaceId, dto.name);
  }

  @Post("identify")
  async identify(@Req() req: any, @Body() dto: IdentifyDto) {
    const rawBody: Buffer = Buffer.isBuffer(req.rawBody)
      ? req.rawBody
      : Buffer.from(JSON.stringify(dto));
    await this.events.verifySignatureOrThrow({
      workspaceId: dto.workspaceId,
      rawBody,
      headers: req.headers ?? {},
    });
    return this.events.identify({
      workspaceId: dto.workspaceId,
      subjectId: dto.subjectId,
      idempotencyKey: dto.idempotencyKey,
      traits: dto.traits,
      email: dto.email,
    });
  }

  @Post("events")
  async track(@Req() req: any, @Body() dto: TrackEventDto) {
    const rawBody: Buffer = Buffer.isBuffer(req.rawBody)
      ? req.rawBody
      : Buffer.from(JSON.stringify(dto));
    await this.events.verifySignatureOrThrow({
      workspaceId: dto.workspaceId,
      rawBody,
      headers: req.headers ?? {},
    });

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : undefined;

    return this.events.track({
      workspaceId: dto.workspaceId,
      subjectId: dto.subjectId,
      name: dto.name,
      idempotencyKey: dto.idempotencyKey,
      occurredAt,
      properties: dto.properties,
      email: dto.email,
    });
  }
}
