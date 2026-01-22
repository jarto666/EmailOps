import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({ description: 'Instance name', required: false })
  @IsOptional()
  @IsString()
  instanceName?: string;

  @ApiProperty({ description: 'Default timezone', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: 'Default batch size for email sending (10-1000)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  batchSize?: number;

  @ApiProperty({ description: 'Rate limit per second (1-500)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  rateLimitPerSecond?: number;

  @ApiProperty({ description: 'Default collision window in seconds', required: false })
  @IsOptional()
  @IsNumber()
  @Min(3600)
  @Max(604800)
  collisionWindow?: number;

  @ApiProperty({ description: 'Query timeout in seconds (5-300)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(300)
  queryTimeout?: number;
}

// WorkspaceSettings interface (matches Prisma model)
export interface WorkspaceSettings {
  id: string;
  workspaceId: string;
  instanceName: string;
  timezone: string;
  batchSize: number;
  rateLimitPerSecond: number;
  collisionWindow: number;
  queryTimeout: number;
  createdAt: Date;
  updatedAt: Date;
}
