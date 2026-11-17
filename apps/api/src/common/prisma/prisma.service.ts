import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

// Connects lazily so the API can boot (and report health) while Postgres is
// unavailable in development.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private attempted = false;

  async connect(): Promise<void> {
    if (this.attempted) return;
    this.attempted = true;
    try {
      await this.$connect();
      this.logger.log("Connected to PostgreSQL");
    } catch (error) {
      this.logger.error(
        "Database connection failed. Run `npm run db:migrate` after starting Postgres.",
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
