import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { DataConnectorsService } from "./data-connectors.service";
import {
  CreateConnectorDto,
  TestConnectionDto,
  UpdateConnectorDto,
} from "../connectors/dto/connector.dto";

@Controller("data-connectors")
export class DataConnectorsController {
  constructor(private readonly connectors: DataConnectorsService) {}

  @Post()
  create(@Body() dto: CreateConnectorDto) {
    return this.connectors.create(dto);
  }

  @Get()
  list(@Query("workspaceId") workspaceId: string) {
    return this.connectors.list(workspaceId);
  }

  @Get(":id")
  get(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Query("includeConfig") includeConfig?: string,
  ) {
    return this.connectors.get(workspaceId, id, includeConfig === "true");
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: UpdateConnectorDto,
  ) {
    return this.connectors.update(workspaceId, id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.connectors.remove(workspaceId, id);
  }

  @Post("test-connection")
  testConnection(@Body() dto: TestConnectionDto) {
    return this.connectors.testConnection(dto.type, dto.config);
  }

  @Get(":id/config/:fieldKey")
  getConfigField(
    @Param("id") id: string,
    @Param("fieldKey") fieldKey: string,
    @Query("workspaceId") workspaceId: string,
  ) {
    return this.connectors.getConfigField(workspaceId, id, fieldKey);
  }
}
