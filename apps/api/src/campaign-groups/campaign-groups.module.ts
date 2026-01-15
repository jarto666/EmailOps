import { Module } from '@nestjs/common';
import { CampaignGroupsController } from './campaign-groups.controller';
import { CampaignGroupsService } from './campaign-groups.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CampaignGroupsController],
  providers: [CampaignGroupsService],
  exports: [CampaignGroupsService],
})
export class CampaignGroupsModule {}
