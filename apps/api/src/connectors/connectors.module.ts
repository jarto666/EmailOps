import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConnectorsController } from './connectors.controller';
import { ConnectorsService } from './connectors.service';
import { SenderProfilesController } from './sender-profiles.controller';
import { SenderProfilesService } from './sender-profiles.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConnectorsController, SenderProfilesController],
  providers: [ConnectorsService, SenderProfilesService],
})
export class ConnectorsModule {}
