import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { ComponentType, ContentType } from '@prisma/client';

export class ComponentVariableDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string; // 'string' | 'color' | 'url' | 'image'

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateComponentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(ComponentType)
  type!: ComponentType;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentVariableDto)
  variables?: ComponentVariableDto[];
}
