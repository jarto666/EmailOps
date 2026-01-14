import { JourneyNodeType, JourneyStatus } from "@email-ops/core";
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateJourneyDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateJourneyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(JourneyStatus)
  @IsOptional()
  status?: JourneyStatus;
}

export class UpsertJourneyVersionDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsArray()
  nodes!: Array<{
    nodeKey: string;
    type: JourneyNodeType;
    config?: Record<string, any>;
  }>;

  @IsArray()
  edges!: Array<{
    fromNodeKey: string;
    toNodeKey: string;
    condition?: Record<string, any>;
  }>;
}

export class PublishJourneyVersionDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;
}

