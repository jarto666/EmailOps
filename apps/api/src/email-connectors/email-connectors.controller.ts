import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { EmailConnectorsService } from "./email-connectors.service";
import {
  CreateEmailConnectorDto,
  TestEmailConnectorDto,
  UpdateEmailConnectorDto,
} from "./dto/email-connector.dto";

@Controller("email-connectors")
export class EmailConnectorsController {
  constructor(private readonly connectors: EmailConnectorsService) {}

  @Post()
  create(@Body() dto: CreateEmailConnectorDto) {
    return this.connectors.create(dto);
  }

  @Get()
  list(@Query("workspaceId") workspaceId: string) {
    return this.connectors.list(workspaceId);
  }

  @Get(":id")
  get(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.connectors.get(workspaceId, id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: UpdateEmailConnectorDto
  ) {
    return this.connectors.update(workspaceId, id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.connectors.remove(workspaceId, id);
  }

  @Post("test-connection")
  testConnection(@Body() dto: TestEmailConnectorDto) {
    return this.connectors.testConnection(dto.type, dto.config);
  }
}

