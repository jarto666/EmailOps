import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSenderProfileDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  emailProviderConnectorId!: string;

  @IsEmail()
  fromEmail!: string;

  @IsString()
  @IsOptional()
  fromName?: string;

  @IsEmail()
  @IsOptional()
  replyTo?: string;
}

export class UpdateSenderProfileDto {
  @IsEmail()
  @IsOptional()
  fromEmail?: string;

  @IsString()
  @IsOptional()
  fromName?: string;

  @IsEmail()
  @IsOptional()
  replyTo?: string;
}
