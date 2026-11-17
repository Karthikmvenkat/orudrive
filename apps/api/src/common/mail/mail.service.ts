import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { Transporter } from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private from = "SavariGo <no-reply@savarigo.com>";

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>("SMTP_HOST");
    this.from =
      this.config.get<string>("MAIL_FROM") ?? "SavariGo <no-reply@savarigo.com>";
    if (!host) {
      this.logger.warn("SMTP_HOST is not set; mail delivery is disabled");
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>("SMTP_PORT") ?? 587),
      secure: Number(this.config.get<string>("SMTP_PORT") ?? 587) === 465,
      auth: this.config.get<string>("SMTP_USER")
        ? {
            user: this.config.get<string>("SMTP_USER"),
            pass: this.config.get<string>("SMTP_PASSWORD"),
          }
        : undefined,
    });
  }

  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Mail not sent (SMTP disabled): ${message.to} — ${message.subject}`);
      return false;
    }
    try {
      await this.transporter.sendMail({ from: this.from, ...message });
      return true;
    } catch (error) {
      this.logger.error(
        `Mail delivery failed for ${message.to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
