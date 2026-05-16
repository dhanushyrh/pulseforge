import {
  Body, Controller, ForbiddenException, Get, HttpCode,
  HttpStatus, Post, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { User } from '@app/database';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GenerateInviteDto } from './dto/generate-invite.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: { user: User }, @Body() _dto: LoginDto) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: { user: { userId: string; tokenId: string } }) {
    return this.authService.refresh(req.user.userId, req.user.tokenId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: { user: { userId: string } }, @Body('refreshToken') rawRefreshToken: string) {
    const payload = this.jwtService.decode(rawRefreshToken) as { tokenId: string } | null;
    const tokenId = payload?.tokenId;
    if (tokenId) {
      await this.authService.logout(req.user.userId, tokenId);
    }
    return { message: 'Logged out' };
  }

  @Get('me')
  async me(@CurrentUser() user: { userId: string }) {
    return this.authService.getMe(user.userId);
  }

  @Post('invite')
  async generateInvite(
    @CurrentUser() user: { userId: string; plan: string },
    @Body() dto: GenerateInviteDto,
  ) {
    if (user.plan !== 'admin') throw new ForbiddenException('Admin access required');
    return this.authService.generateInviteCode(user.userId, dto);
  }
}
