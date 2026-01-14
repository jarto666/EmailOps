import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ConnectorsService } from './connectors.service';
import { CreateConnectorDto, TestConnectionDto, UpdateConnectorDto } from './dto/connector.dto';

@Controller('connectors')
export class ConnectorsController {
  constructor(private readonly connectors: ConnectorsService) {}

  @Post()
  create(@Body() dto: CreateConnectorDto) {
    return this.connectors.create(dto);
  }

  @Get()
  list(@Query('workspaceId') workspaceId: string) {
    return this.connectors.list(workspaceId);
  }

  @Get(':id')
  get(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.connectors.get(workspaceId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateConnectorDto,
  ) {
    return this.connectors.update(workspaceId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.connectors.remove(workspaceId, id);
  }

  @Post('test-connection')
  testConnection(@Body() dto: TestConnectionDto) {
    return this.connectors.testConnection(dto.type, dto.config);
  }
}

