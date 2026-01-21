import { ScheduleType, SingleSendStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateSingleSendDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SingleSendStatus)
  @IsOptional()
  status?: SingleSendStatus;

  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsString()
  @IsNotEmpty()
  segmentId!: string;

  @IsString()
  @IsNotEmpty()
  senderProfileId!: string;

  @IsEnum(ScheduleType)
  @IsOptional()
  scheduleType?: ScheduleType;

  @IsString()
  @IsOptional()
  cronExpression?: string;

  @IsObject()
  @IsOptional()
  policies?: Record<string, any>;
}

export class UpdateSingleSendDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SingleSendStatus)
  @IsOptional()
  status?: SingleSendStatus;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  segmentId?: string;

  @IsString()
  @IsOptional()
  senderProfileId?: string;

  @IsEnum(ScheduleType)
  @IsOptional()
  scheduleType?: ScheduleType;

  @IsString()
  @IsOptional()
  cronExpression?: string;

  @IsObject()
  @IsOptional()
  policies?: Record<string, any>;
}

export class TriggerSingleSendDto {
  // reserved for future
}

