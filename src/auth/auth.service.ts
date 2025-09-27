import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}
  
  
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        uuid: randomUUID(),
        username: dto.username,
        email: dto.email,
        password: passwordHash,
      },
      select: { id: true, uuid: true, username: true, email: true, createdAt: true },
    });

    const token = await this.signToken(user.id, user.uuid, user.email);
    return { user, token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = await this.signToken(user.id, user.uuid, user.email);
    const safeUser = {
      id: user.id, uuid: user.uuid, username: user.username, email: user.email, createdAt: user.createdAt,
    };
    return { user: safeUser, token };
  }

  async me(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, uuid: true, username: true, email: true, createdAt: true, updatedAt: true },
    });
  }

  private signToken(id: number, uuid: string, email: string) {
    return this.jwt.signAsync({ sub: id, uuid, email });
  }
}
