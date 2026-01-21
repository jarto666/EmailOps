import { EmailProviderType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateEmailConnectorDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(EmailProviderType)
  type!: EmailProviderType;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsObject()
  config!: Record<string, any>;
}

export class UpdateEmailConnectorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(EmailProviderType)
  @IsOptional()
  type?: EmailProviderType;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

export class TestEmailConnectorDto {
  @IsEnum(EmailProviderType)
  type!: EmailProviderType;

  @IsObject()
  config!: Record<string, any>;
}

