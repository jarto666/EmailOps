import { IsString, IsOptional, IsInt, IsEnum, Min, Max, MinLength, MaxLength } from 'class-validator';
import { CollisionPolicy } from '@prisma/client';

export class UpdateCampaignGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(3600)      // Minimum 1 hour
  @Max(604800)    // Maximum 7 days
  collisionWindow?: number;

  @IsOptional()
  @IsEnum(CollisionPolicy)
  collisionPolicy?: CollisionPolicy;
}
