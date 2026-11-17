import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { RoleName } from "../constants/roles";

export interface AuthUser {
  id: string;
  email: string;
  roles: RoleName[];
}

export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
