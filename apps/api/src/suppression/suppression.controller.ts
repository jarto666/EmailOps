import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SuppressionService } from './suppression.service';
import { CreateSuppressionDto, BatchCheckSuppressionDto } from './dto';
import { SuppressionReason } from '@prisma/client';

@ApiTags('suppressions')
@Controller('suppressions')
export class SuppressionController {
  constructor(private readonly suppressionService: SuppressionService) {}

  @Post()
  @ApiOperation({ summary: 'Add email to suppression list' })
  @ApiResponse({ status: 201, description: 'Suppression created successfully' })
  @ApiResponse({ status: 409, description: 'Email already suppressed' })
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateSuppressionDto
  ) {
    return this.suppressionService.create(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all suppressions' })
  @ApiQuery({ name: 'reason', required: false, enum: ['BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE', 'MANUAL'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by email' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('reason') reason?: SuppressionReason,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.suppressionService.findAll(workspaceId, {
      reason,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get suppression statistics' })
  getStats(@Query('workspaceId') workspaceId: string) {
    return this.suppressionService.getStats(workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get suppression by ID' })
  @ApiResponse({ status: 404, description: 'Suppression not found' })
  findOne(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string
  ) {
    return this.suppressionService.findOne(workspaceId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove suppression by ID' })
  @ApiResponse({ status: 200, description: 'Suppression removed' })
  @ApiResponse({ status: 404, description: 'Suppression not found' })
  remove(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string
  ) {
    return this.suppressionService.remove(workspaceId, id);
  }

  @Post('check')
  @ApiOperation({ summary: 'Batch check emails for suppression' })
  batchCheck(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: BatchCheckSuppressionDto
  ) {
    return this.suppressionService.batchCheckSuppressions(workspaceId, dto.emails);
  }

  @Delete('by-email/:email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove suppression by email address' })
  @ApiResponse({ status: 200, description: 'Suppression removed' })
  @ApiResponse({ status: 404, description: 'Suppression not found' })
  removeByEmail(
    @Query('workspaceId') workspaceId: string,
    @Param('email') email: string
  ) {
    return this.suppressionService.removeByEmail(workspaceId, email);
  }
}
