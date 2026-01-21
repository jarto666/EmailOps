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

import { ComponentVariableDto } from './create-component.dto';

export class UpdateComponentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(ComponentType)
  type?: ComponentType;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentVariableDto)
  variables?: ComponentVariableDto[];
}
