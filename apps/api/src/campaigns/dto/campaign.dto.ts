import { CampaignStatus, ScheduleType } from "@email-ops/core";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

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

export class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

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

export class TriggerCampaignDto {
  // reserved for future: manual overrides, dry-run, etc.
}

