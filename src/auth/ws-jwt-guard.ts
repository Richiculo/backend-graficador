// src/auth/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { env } from '../config/env';

@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client: any = context.switchToWs().getClient();

    // ✅ Si el middleware de handshake ya puso el user, dejamos pasar
    if (client?.data?.user) return true;

    // Fallback: intentar leer token del handshake si por alguna razón no está el user
    const hs = client?.handshake || client?.request || client?.conn?.request;
    const authHeader: string | undefined = hs?.headers?.authorization;
    const authToken: string | undefined =
      hs?.auth?.token || hs?.query?.token || hs?._query?.token;

    let token: string | undefined;
    if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
    else if (typeof authToken === 'string') token = authToken.startsWith('Bearer ')
      ? authToken.slice(7)
      : authToken;

    if (!token) throw new UnauthorizedException('Missing JWT');

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      client.data = client.data || {};
      client.data.user = { id: payload.sub, uuid: payload.uuid, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid JWT');
    }
  }
}
