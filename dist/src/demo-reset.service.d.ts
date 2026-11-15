import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
export declare class DemoResetService implements OnApplicationBootstrap {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onApplicationBootstrap(): Promise<void>;
}
