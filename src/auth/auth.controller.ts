import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.service.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@CurrentUser() user: { id: number }) {
    return this.service.me(user.id);
  }
}
