"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDemo = seedDemo;
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const DEMO_TEAM_SLUG = 'engineering-team-demo';
const DEMO_PEOPLE = [
    { email: 'alice@projectflow.dev', name: 'Alice Johnson', role: client_1.Role.ADMIN },
    { email: 'bob@projectflow.dev', name: 'Bob Martinez', role: client_1.Role.MANAGER },
    { email: 'carlos@projectflow.dev', name: 'Carlos Rivera', role: client_1.Role.DEVELOPER },
];
async function seedDemo(prisma) {
    const password = await bcrypt.hash('Password123!', 12);
    await prisma.$transaction(async (tx) => {
        const reset = {
            password, isActive: true, avatar: null, bio: null, phone: null,
            jobTitle: null, location: null, birthDate: null,
        };
        const users = [];
        for (const p of DEMO_PEOPLE) {
            users.push(await tx.user.upsert({
                where: { email: p.email },
                update: { name: p.name, ...reset },
                create: { name: p.name, email: p.email, password },
            }));
        }
        const [alice, bob, carlos] = users;
        const ids = users.map((u) => u.id);
        await tx.team.deleteMany({
            where: {
                slug: { not: DEMO_TEAM_SLUG },
                members: { some: { userId: { in: ids } }, every: { userId: { in: ids } } },
            },
        });
        await tx.team.deleteMany({ where: { slug: DEMO_TEAM_SLUG } });
        await tx.notification.deleteMany({ where: { userId: { in: ids } } });
        await tx.team.create({
            data: {
                name: 'Engineering Team',
                description: 'Main product engineering team',
                slug: DEMO_TEAM_SLUG,
                members: { create: DEMO_PEOPLE.map((p, i) => ({ userId: ids[i], role: p.role })) },
                projects: {
                    create: [
                        { id: 'demo-project-1', name: 'Website Redesign', description: 'Complete redesign of the marketing website', status: 'ACTIVE' },
                        { id: 'demo-project-2', name: 'Mobile App v2', description: 'Second version of the mobile application', status: 'ACTIVE' },
                    ],
                },
            },
        });
        const day = 24 * 60 * 60 * 1000;
        const due = (days) => new Date(Date.now() + days * day);
        const S = client_1.TaskStatus;
        const P = client_1.TaskPriority;
        const boards = {
            'demo-project-1': [
                ['Design new landing page', S.DONE, P.HIGH, alice.id, -6],
                ['Implement authentication flow', S.IN_PROGRESS, P.URGENT, bob.id, 2],
                ['Write API documentation', S.TODO, P.MEDIUM, carlos.id, 7],
                ['Setup CI/CD pipeline', S.IN_REVIEW, P.HIGH, alice.id, 1],
                ['Performance optimization', S.BACKLOG, P.LOW, null, null],
                ['Mobile responsive fixes', S.TODO, P.MEDIUM, bob.id, -1],
                ['Accessibility audit (WCAG AA)', S.BACKLOG, P.MEDIUM, carlos.id, 14],
                ['SEO metadata and sitemap', S.DONE, P.LOW, carlos.id, -3],
            ],
            'demo-project-2': [
                ['Define v2 navigation', S.DONE, P.HIGH, bob.id, -10],
                ['Offline mode for task list', S.IN_PROGRESS, P.HIGH, alice.id, 5],
                ['Push notifications', S.TODO, P.MEDIUM, carlos.id, 10],
                ['Dark mode polish', S.IN_REVIEW, P.LOW, carlos.id, 3],
                ['Crash reporting integration', S.BACKLOG, P.URGENT, null, null],
            ],
        };
        for (const [projectId, rows] of Object.entries(boards)) {
            for (const [i, [title, status, priority, assigneeId, dueIn]] of rows.entries()) {
                const task = await tx.task.create({
                    data: {
                        title, status, priority, assigneeId, position: i, projectId,
                        creatorId: alice.id,
                        dueDate: dueIn === null ? null : due(dueIn),
                        description: `Task description for: ${title}`,
                    },
                });
                if (status === S.IN_PROGRESS || status === S.IN_REVIEW) {
                    await tx.comment.createMany({
                        data: [
                            { taskId: task.id, authorId: bob.id, content: 'I started on this, first draft is up for review.' },
                            { taskId: task.id, authorId: alice.id, content: 'Looks good! Left a couple of notes on edge cases.' },
                        ],
                    });
                }
            }
        }
    }, { timeout: 30_000 });
}
if (require.main === module) {
    const prisma = new client_1.PrismaClient();
    seedDemo(prisma)
        .then(() => {
        console.log('Demo data ready. Accounts (password: Password123!):');
        for (const p of DEMO_PEOPLE)
            console.log(`  ${p.email}  ${p.role}`);
    })
        .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
        .finally(() => prisma.$disconnect());
}
//# sourceMappingURL=seed.js.map