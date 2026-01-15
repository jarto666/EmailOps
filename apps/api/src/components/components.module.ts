import { Module } from '@nestjs/common';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComponentsController],
  providers: [ComponentsService],
  exports: [ComponentsService],
})
export class ComponentsModule {}
