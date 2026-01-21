import { IsArray, IsEmail, ArrayMaxSize } from 'class-validator';

export class BatchCheckSuppressionDto {
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMaxSize(1000)
  emails!: string[];
}
