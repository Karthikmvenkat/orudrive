import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/auth.decorators";
import { ROLES } from "../common/constants/roles";
import {
  CustomersQueryDto,
  UpdateCustomerProfileDto,
} from "./customers.dto";
import { CustomersService } from "./customers.service";

@ApiTags("customers")
@ApiBearerAuth()
@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get("me")
  @ApiOperation({ summary: "Current customer profile" })
  me(@CurrentUser("id") userId: string) {
    return this.customers.me(userId);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update the current customer profile" })
  updateMe(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customers.updateMe(userId, dto);
  }

  @Get()
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "List customer profiles (admin/support)" })
  list(@Query() query: CustomersQueryDto) {
    return this.customers.list(query);
  }

  @Get(":id")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Get a customer profile (admin/support)" })
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.customers.getById(id);
  }
}
