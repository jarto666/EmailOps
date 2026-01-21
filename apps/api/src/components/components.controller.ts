import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ComponentsService } from './components.service';
import { CreateComponentDto, UpdateComponentDto } from './dto';

@Controller('components')
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateComponentDto,
  ) {
    return this.componentsService.create(workspaceId, dto);
  }

  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('type') type?: string,
  ) {
    return this.componentsService.findAll(workspaceId, type);
  }

  @Get(':id')
  findOne(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.componentsService.findOne(workspaceId, id);
  }

  @Patch(':id')
  update(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateComponentDto,
  ) {
    return this.componentsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.componentsService.remove(workspaceId, id);
  }

  @Post(':id/preview')
  preview(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { variables?: Record<string, any> },
  ) {
    return this.componentsService.preview(workspaceId, id, body.variables);
  }
}
