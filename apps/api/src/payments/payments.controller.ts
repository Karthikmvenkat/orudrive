import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { Public, Roles } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import {
  CreatePaymentOrderDto,
  ManagePaymentsQueryDto,
  PaymentsQueryDto,
  RefundPaymentDto,
  VerifyPaymentDto,
} from "./payments.dto";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiBearerAuth()
  @Post("orders")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: "Create a Razorpay order for a booking" })
  createOrder(
    @CurrentUser("id") userId: string,
    @Body() dto: CreatePaymentOrderDto,
  ) {
    return this.payments.createOrder(userId, dto);
  }

  @ApiBearerAuth()
  @Post("verify")
  @ApiOperation({ summary: "Verify a Razorpay checkout signature" })
  verify(@CurrentUser("id") userId: string, @Body() dto: VerifyPaymentDto) {
    return this.payments.verify(userId, dto);
  }

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: "My payment history" })
  history(
    @CurrentUser("id") userId: string,
    @Query() query: PaymentsQueryDto,
  ) {
    return this.payments.history(userId, query);
  }

  @ApiBearerAuth()
  @Get("manage")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Every payment (admin/support)" })
  listAll(@Query() query: ManagePaymentsQueryDto) {
    return this.payments.listAll(query);
  }

  @ApiBearerAuth()
  @Post(":id/refund")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Refund a captured payment or part of it" })
  refund(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.payments.refundPayment(actor, id, dto);
  }

  @Public()
  @Post("webhook")
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @ApiHeader({
    name: "x-razorpay-signature",
    required: true,
    description: "HMAC SHA256 of the raw request body",
  })
  @ApiOperation({ summary: "Razorpay webhook endpoint" })
  webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature?: string,
  ) {
    return this.payments.handleWebhook(
      request.rawBody ?? Buffer.from(""),
      signature,
    );
  }
}
