import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";
import { DemoService } from "./demo.service";

@ApiTags("demo")
@Controller("demo")
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get("sends")
  @ApiOperation({ summary: "List recent sends for demo tools" })
  @ApiQuery({ name: "workspaceId", required: true })
  @ApiQuery({ name: "limit", required: false })
  async listRecentSends(
    @Query("workspaceId") workspaceId: string,
    @Query("limit") limit?: string
  ) {
    if (!workspaceId) {
      throw new BadRequestException("workspaceId is required");
    }
    return this.demoService.listRecentSends(
      workspaceId,
      limit ? parseInt(limit, 10) : 50
    );
  }

  @Post("sends/:sendId/deliver")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Simulate delivery event for a send" })
  @ApiParam({ name: "sendId", description: "Send ID" })
  async simulateDelivery(@Param("sendId") sendId: string) {
    return this.demoService.simulateDelivery(sendId);
  }

  @Post("sends/:sendId/bounce")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Simulate bounce event for a send" })
  @ApiParam({ name: "sendId", description: "Send ID" })
  async simulateBounce(
    @Param("sendId") sendId: string,
    @Body() body: { bounceType?: "hard" | "soft" }
  ) {
    return this.demoService.simulateBounce(sendId, body.bounceType ?? "hard");
  }

  @Post("sends/:sendId/complaint")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Simulate complaint event for a send" })
  @ApiParam({ name: "sendId", description: "Send ID" })
  async simulateComplaint(@Param("sendId") sendId: string) {
    return this.demoService.simulateComplaint(sendId);
  }

  @Get("enabled")
  @ApiOperation({ summary: "Check if demo mode is enabled" })
  async isDemoEnabled() {
    return { enabled: this.demoService.isDemoMode() };
  }
}
