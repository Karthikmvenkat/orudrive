import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

export class CreateTicketDto {
  @ApiProperty({ enum: TicketCategory })
  @IsEnum(TicketCategory)
  category!: TicketCategory;

  @ApiProperty({ example: "Deposit not refunded" })
  @IsString()
  @MinLength(5)
  @MaxLength(160)
  subject!: string;

  @ApiProperty({ example: "Booking SVR603813 ended on 12 Nov but the deposit..." })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: "Booking uuid or SVR code" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  bookingRef?: string;
}

export class ReplyTicketDto {
  @ApiProperty({ example: "We have started the refund." })
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  body!: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}

export class TicketQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ example: "deposit" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
}
