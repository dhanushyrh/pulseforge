// apps/gateway/src/creator/creator.controller.ts
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { CreatorService } from './creator.service';

@Controller('v1/creators')
export class CreatorController {
  constructor(private readonly service: CreatorService) {}

  @Get()
  async listCreators() {
    return this.service.findAll();
  }

  @Get(':handle')
  async getCreator(@Param('handle') handle: string) {
    const creator = await this.service.findByHandle(decodeURIComponent(handle));
    if (!creator) throw new NotFoundException(`Creator ${handle} not found`);
    return creator;
  }
}
