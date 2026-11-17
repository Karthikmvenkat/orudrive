import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  IsNumber,
} from "class-validator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

export class CreatePaymentOrderDto {
  @ApiProperty()
  @IsUUID()
  bookingId!: string;

  @ApiPropertyOptional({
    description: "Client-generated key to make retries idempotent",
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  idempotencyKey?: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ example: "order_NxAbc123" })
  @IsString()
  @MaxLength(80)
  razorpayOrderId!: string;

  @ApiProperty({ example: "pay_NxAbc456" })
  @IsString()
  @MaxLength(80)
  razorpayPaymentId!: string;

  @ApiProperty({ description: "HMAC signature returned by Checkout" })
  @IsString()
  @MaxLength(200)
  razorpaySignature!: string;
}

export class RefundPaymentDto {
  @ApiPropertyOptional({
    description: "Amount in INR; defaults to the remaining refundable amount",
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class PaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class ManagePaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: "Booking code or customer email/phone" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;
}
