import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/auth.decorators";
import type { AuthUser } from "../decorators/current-user.decorator";
import type { RoleName } from "../constants/roles";

interface AccessPayload {
  sub: string;
  email: string;
  roles?: RoleName[];
  type?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(
        header.slice("Bearer ".length),
        {
          secret:
            this.config.get<string>("JWT_ACCESS_SECRET") ??
            "dev-only-access-secret-change-me",
        },
      );
      if (payload.type && payload.type !== "access") {
        throw new Error("Wrong token type");
      }
      request.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles ?? [],
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
