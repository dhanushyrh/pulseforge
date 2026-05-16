import * as crypto from 'crypto';
import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, InviteCode, RefreshToken, IngestUsage } from '@app/database';
import { RegisterDto } from './dto/register.dto';
import { GenerateInviteDto } from './dto/generate-invite.dto';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

export interface JwtUser {
  userId: string;
  email: string;
  plan: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(InviteCode)
    private readonly inviteCodeRepo: Repository<InviteCode>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,

    @InjectRepository(IngestUsage)
    private readonly ingestUsageRepo: Repository<IngestUsage>,

    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return null;
    if (!user.isActive) throw new ForbiddenException('Account suspended');
    return user;
  }

  async register(dto: RegisterDto) {
    const invite = await this.inviteCodeRepo.findOne({ where: { code: dto.inviteCode } });
    if (!invite) throw new BadRequestException('Invalid invite code');
    if (invite.isUsed) throw new BadRequestException('Invite code already used');
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite code expired');
    }

    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      plan: invite.plan,
      inviteCode: dto.inviteCode,
    });
    await this.userRepo.save(user);

    invite.isUsed = true;
    invite.usedByEmail = dto.email;
    invite.usedAt = new Date();
    await this.inviteCodeRepo.save(invite);

    return this.generateTokens(user);
  }

  async login(user: User) {
    return this.generateTokens(user);
  }

  async refresh(userId: string, tokenId: string) {
    const token = await this.refreshTokenRepo.findOne({
      where: { id: tokenId, userId },
    });
    if (!token) throw new UnauthorizedException();
    if (token.isRevoked) throw new UnauthorizedException('Token revoked');
    if (token.expiresAt < new Date()) throw new UnauthorizedException('Token expired');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    token.isRevoked = true;
    await this.refreshTokenRepo.save(token);

    return this.generateTokens(user);
  }

  async logout(userId: string, tokenId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { id: tokenId, userId },
      { isRevoked: true },
    );
  }

  async generateTokens(user: User) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, plan: user.plan },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: (process.env.JWT_ACCESS_EXPIRES ?? '15m') as any,
      },
    );

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const savedToken = this.refreshTokenRepo.create({ userId: user.id, tokenHash, expiresAt });
    await this.refreshTokenRepo.save(savedToken);

    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenId: savedToken.id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES ?? '7d') as any,
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        createdAt: user.createdAt,
      },
    };
  }

  async generateInviteCode(adminUserId: string, dto: GenerateInviteDto): Promise<InviteCode> {
    const code = 'PF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const invite = this.inviteCodeRepo.create({
      code,
      plan: dto.plan ?? 'free',
      createdByAdminId: adminUserId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
    return this.inviteCodeRepo.save(invite);
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const { passwordHash: _pw, ...safe } = user;
    return safe;
  }
}
