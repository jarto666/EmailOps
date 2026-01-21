import { AuthoringMode } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateTemplateVersionDto {
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsEnum(AuthoringMode)
  mode!: AuthoringMode;

  // For RAW_HTML
  @IsString()
  @IsOptional()
  bodyHtml?: string;

  // For RAW_MJML
  @IsString()
  @IsOptional()
  bodyMjml?: string;

  // For UI_BUILDER
  @IsObject()
  @IsOptional()
  builderSchema?: Record<string, any>;
}

export class UpdateTemplateVersionDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsEnum(AuthoringMode)
  @IsOptional()
  mode?: AuthoringMode;

  @IsString()
  @IsOptional()
  bodyHtml?: string;

  @IsString()
  @IsOptional()
  bodyMjml?: string;

  @IsObject()
  @IsOptional()
  builderSchema?: Record<string, any>;
}

export class RenderTemplateVersionDto {
  @IsObject()
  variables!: Record<string, any>;
}

