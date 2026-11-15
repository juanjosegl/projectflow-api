import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { seedDemo } from '../prisma/seed';

/**
 * Restores the shared demo team every time the API boots. On Render's free tier the
 * service sleeps after ~15 idle minutes, so each new visitor starts from clean data.
 * On by default on Render, off elsewhere; DEMO_RESET_ON_BOOT=true|false overrides it.
 */
@Injectable()
export class DemoResetService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoResetService.name);

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    const flag = process.env.DEMO_RESET_ON_BOOT ?? (process.env.RENDER ? 'true' : 'false');
    if (flag !== 'true') return;
    try {
      await seedDemo(this.prisma);
      this.logger.log('Demo data restored');
    } catch (e) {
      // A failed reset must not keep the API down.
      this.logger.error(`Demo reset failed: ${(e as Error).message}`);
    }
  }
}
