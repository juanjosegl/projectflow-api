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
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const password = await bcrypt.hash('Password123!', 12);
    const alice = await prisma.user.upsert({
        where: { email: 'alice@projectflow.dev' },
        update: {},
        create: { name: 'Alice Johnson', email: 'alice@projectflow.dev', password },
    });
    const bob = await prisma.user.upsert({
        where: { email: 'bob@projectflow.dev' },
        update: {},
        create: { name: 'Bob Martinez', email: 'bob@projectflow.dev', password },
    });
    const carlos = await prisma.user.upsert({
        where: { email: 'carlos@projectflow.dev' },
        update: {},
        create: { name: 'Carlos Rivera', email: 'carlos@projectflow.dev', password },
    });
    const team = await prisma.team.upsert({
        where: { slug: 'engineering-team-demo' },
        update: {},
        create: {
            name: 'Engineering Team',
            description: 'Main product engineering team',
            slug: 'engineering-team-demo',
            members: {
                create: [
                    { userId: alice.id, role: client_1.Role.ADMIN },
                    { userId: bob.id, role: client_1.Role.MANAGER },
                    { userId: carlos.id, role: client_1.Role.DEVELOPER },
                ],
            },
        },
    });
    await prisma.project.upsert({
        where: { id: 'demo-project-1' },
        update: {},
        create: {
            id: 'demo-project-1',
            name: 'Website Redesign',
            description: 'Complete redesign of the marketing website',
            status: 'ACTIVE',
            teamId: team.id,
        },
    });
    await prisma.project.upsert({
        where: { id: 'demo-project-2' },
        update: {},
        create: {
            id: 'demo-project-2',
            name: 'Mobile App v2',
            description: 'Second version of the mobile application',
            status: 'ACTIVE',
            teamId: team.id,
        },
    });
    const existing = await prisma.task.count({ where: { project: { teamId: team.id } } });
    if (existing > 0) {
        console.log('Demo tasks already exist, skipping task seed.');
    }
    else {
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
                const task = await prisma.task.create({
                    data: {
                        title, status, priority, assigneeId, position: i, projectId,
                        creatorId: alice.id,
                        dueDate: dueIn === null ? null : due(dueIn),
                        description: `Task description for: ${title}`,
                    },
                });
                if (status === S.IN_PROGRESS || status === S.IN_REVIEW) {
                    await prisma.comment.createMany({
                        data: [
                            { taskId: task.id, authorId: bob.id, content: 'I started on this, first draft is up for review.' },
                            { taskId: task.id, authorId: alice.id, content: 'Looks good! Left a couple of notes on edge cases.' },
                        ],
                    });
                }
            }
        }
    }
    console.log('\nSeed complete!');
    console.log('Demo accounts (password: Password123!):');
    console.log('  alice@projectflow.dev  — Admin');
    console.log('  bob@projectflow.dev    — Manager');
    console.log('  carlos@projectflow.dev — Developer');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map