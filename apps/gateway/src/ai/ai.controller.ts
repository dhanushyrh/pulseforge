import {
  Controller, Post, Get, Param, Body, Res, Query,
  HttpCode, HttpStatus, HttpException, UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { AiUsageService } from './ai-usage.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class SendMessageDto {
  message: string;
  tripId?: string;
  mode?: 'chat' | 'generate';
}

@Controller('ai')
@UseGuards(ThrottlerGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  @Post('conversations/:id/message')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 2, ttl: 1000 } })
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: { userId: string; email: string; plan: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const event of this.aiService.streamResponse(
        conversationId,
        dto.message,
        user,
        dto.tripId,
        dto.mode ?? 'chat',
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: 'error', code: 'internal_error', message: 'Unexpected server error' })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Get('usage')
  async getUsage(
    @CurrentUser() user: { userId: string; email: string; plan: string },
  ) {
    return this.aiUsageService.getUsageStats(user.userId, user.plan);
  }

  @Get('usage/history')
  async getUsageHistory(
    @CurrentUser() user: { userId: string; email: string; plan: string },
    @Query('days') days?: string,
  ) {
    const d = Math.min(90, Math.max(1, parseInt(days ?? '7', 10)));
    return this.aiUsageService.getUsageHistory(user.userId, d);
  }

  @Get('admin/usage')
  async getAdminUsage(
    @CurrentUser() user: { userId: string; email: string; plan: string },
  ) {
    if (user.plan !== 'admin') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return this.aiUsageService.getAdminStats();
  }
}
