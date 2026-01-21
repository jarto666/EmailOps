import { DataConnectorType } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateConnectorDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(DataConnectorType)
  type!: DataConnectorType;

  @IsString()
  @IsNotEmpty()
  name!: string;

  // Type-specific config; stored encrypted at rest.
  @IsObject()
  config!: Record<string, any>;
}

export class UpdateConnectorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(DataConnectorType)
  @IsOptional()
  type?: DataConnectorType;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

export class TestConnectionDto {
  @IsEnum(DataConnectorType)
  type!: DataConnectorType;

  @IsObject()
  config!: Record<string, any>;
}
