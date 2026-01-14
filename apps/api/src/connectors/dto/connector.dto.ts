import { ConnectorType } from '@email-ops/core';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateConnectorDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(ConnectorType)
  type!: ConnectorType;

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

  @IsEnum(ConnectorType)
  @IsOptional()
  type?: ConnectorType;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

export class TestConnectionDto {
  @IsEnum(ConnectorType)
  type!: ConnectorType;

  @IsObject()
  config!: Record<string, any>;
}

