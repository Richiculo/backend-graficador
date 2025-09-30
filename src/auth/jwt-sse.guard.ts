import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtSseGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest()
    // mover token de ?access_token al header si no vino
    if (!req.headers.authorization && req.query?.access_token) {
      req.headers.authorization = `Bearer ${req.query.access_token}`
    }
    return req
  }
}
