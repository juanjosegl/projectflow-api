"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DemoResetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoResetService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma/prisma.service");
const seed_1 = require("../prisma/seed");
let DemoResetService = DemoResetService_1 = class DemoResetService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DemoResetService_1.name);
    }
    async onApplicationBootstrap() {
        const flag = process.env.DEMO_RESET_ON_BOOT ?? (process.env.RENDER ? 'true' : 'false');
        if (flag !== 'true')
            return;
        try {
            await (0, seed_1.seedDemo)(this.prisma);
            this.logger.log('Demo data restored');
        }
        catch (e) {
            this.logger.error(`Demo reset failed: ${e.message}`);
        }
    }
};
exports.DemoResetService = DemoResetService;
exports.DemoResetService = DemoResetService = DemoResetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DemoResetService);
//# sourceMappingURL=demo-reset.service.js.map