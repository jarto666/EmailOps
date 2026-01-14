import { TemplateCategory } from "@email-ops/core";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  // e.g. "welcome-email"
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(TemplateCategory)
  category!: TemplateCategory;
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(TemplateCategory)
  @IsOptional()
  category?: TemplateCategory;
}

