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
import { ApiTags } from "@nestjs/swagger";
import { SegmentsService } from "./segments.service";
import {
  CreateSegmentDto,
  DryRunSegmentDto,
  UpdateSegmentDto,
} from "./dto/segment.dto";

@ApiTags('segments')
@Controller("segments")
export class SegmentsController {
  constructor(private readonly segments: SegmentsService) {}

  @Post()
  create(@Body() dto: CreateSegmentDto) {
    return this.segments.create(dto);
  }

  @Get()
  list(@Query("workspaceId") workspaceId: string) {
    return this.segments.list(workspaceId);
  }

  @Get(":id")
  get(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.segments.get(workspaceId, id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: UpdateSegmentDto
  ) {
    return this.segments.update(workspaceId, id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.segments.remove(workspaceId, id);
  }

  @Post(":id/dry-run")
  dryRun(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: DryRunSegmentDto
  ) {
    return this.segments.dryRun(workspaceId, id, dto);
  }
}
