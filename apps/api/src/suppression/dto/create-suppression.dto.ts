import { IsString, IsEmail, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SuppressionReason } from '@prisma/client';

export class CreateSuppressionDto {
  @ApiProperty({
    description: 'Email address to suppress',
    example: 'user@example.com',
  })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    description: 'Reason for suppression',
    enum: ['BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE', 'MANUAL'],
    example: 'MANUAL',
  })
  @IsEnum(SuppressionReason)
  reason!: SuppressionReason;
}
