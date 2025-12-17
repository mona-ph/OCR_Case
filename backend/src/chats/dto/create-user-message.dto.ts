import { IsString, MinLength } from 'class-validator';

export class CreateUserMessageDto {
  @IsString()
  @MinLength(1)
  content: string;
}