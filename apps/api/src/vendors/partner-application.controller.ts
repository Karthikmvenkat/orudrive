import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/auth.decorators";
import { ApplyPartnerDto } from "./vendors.dto";
import { PartnersService } from "./partners.service";

@ApiTags("rental partners")
@Controller("partners")
export class PartnerApplicationController {
  constructor(private readonly partners: PartnersService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("apply")
  @ApiOperation({
    summary: "Apply as a rental partner; the account lands pending approval",
  })
  apply(@Body() dto: ApplyPartnerDto) {
    return this.partners.apply(dto);
  }
}
