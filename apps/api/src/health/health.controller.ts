import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/auth.decorators";
import { PrismaService } from "../common/prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness and database readiness" })
  async check() {
    const database = (await this.prisma.isHealthy()) ? "up" : "down";
    return {
      status: database === "up" ? "ok" : "degraded",
      service: "savarigo-api",
      version: "0.3.0",
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
