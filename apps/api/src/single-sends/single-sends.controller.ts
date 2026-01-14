import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { SingleSendsService } from "./single-sends.service";
import {
  CreateSingleSendDto,
  TriggerSingleSendDto,
  UpdateSingleSendDto,
} from "./dto/single-send.dto";

@Controller("single-sends")
export class SingleSendsController {
  constructor(private readonly singleSends: SingleSendsService) {}

  @Post()
  create(@Body() dto: CreateSingleSendDto) {
    return this.singleSends.create(dto);
  }

  @Get()
  list(@Query("workspaceId") workspaceId: string) {
    return this.singleSends.list(workspaceId);
  }

  @Get(":id")
  get(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.singleSends.get(workspaceId, id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: UpdateSingleSendDto
  ) {
    return this.singleSends.update(workspaceId, id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.singleSends.remove(workspaceId, id);
  }

  @Post(":id/trigger")
  trigger(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() _dto: TriggerSingleSendDto
  ) {
    return this.singleSends.trigger(workspaceId, id);
  }
}

