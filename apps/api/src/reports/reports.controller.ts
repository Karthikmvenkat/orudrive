import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/auth.decorators";
import { ROLES } from "../common/constants/roles";
import { ReportQueryDto } from "./reports.dto";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@Controller("admin/reports")
@Roles(ROLES.ADMIN, ROLES.SUPPORT)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @ApiOperation({
    summary: "Revenue, booking trend, city, partner and vehicle reports",
  })
  summary(@Query() query: ReportQueryDto) {
    return this.reports.summary(query);
  }
}
