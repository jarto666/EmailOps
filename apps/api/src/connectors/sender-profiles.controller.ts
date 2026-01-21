import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateSenderProfileDto, UpdateSenderProfileDto } from './dto/sender-profile.dto';
import { SenderProfilesService } from './sender-profiles.service';

@Controller('sender-profiles')
export class SenderProfilesController {
  constructor(private readonly senderProfiles: SenderProfilesService) {}

  @Post()
  create(@Body() dto: CreateSenderProfileDto) {
    return this.senderProfiles.create(dto);
  }

  @Get()
  list(@Query('workspaceId') workspaceId: string) {
    return this.senderProfiles.list(workspaceId);
  }

  @Get(':id')
  get(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.senderProfiles.get(workspaceId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateSenderProfileDto,
  ) {
    return this.senderProfiles.update(workspaceId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.senderProfiles.remove(workspaceId, id);
  }
}

