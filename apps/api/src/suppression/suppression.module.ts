import { Module } from '@nestjs/common';
import { SuppressionController } from './suppression.controller';
import { SuppressionService } from './suppression.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SuppressionController],
  providers: [SuppressionService],
  exports: [SuppressionService],
})
export class SuppressionModule {}
