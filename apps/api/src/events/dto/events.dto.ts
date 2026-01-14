import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateIngestKeyDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class TrackEventDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  // Client-provided stable dedupe key for retries.
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsDateString()
  @IsOptional()
  occurredAt?: string;

  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;

  @IsString()
  @IsOptional()
  email?: string;
}

export class IdentifyDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsObject()
  @IsOptional()
  traits?: Record<string, any>;

  @IsString()
  @IsOptional()
  email?: string;
}

