import { PrismaClient, TaskStatus, TaskPriority, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const DEMO_TEAM_SLUG = 'engineering-team-demo';
const DEMO_PEOPLE = [
  { email: 'alice@projectflow.dev', name: 'Alice Johnson', role: Role.ADMIN },
  { email: 'bob@projectflow.dev', name: 'Bob Martinez', role: Role.MANAGER },
  { email: 'carlos@projectflow.dev', name: 'Carlos Rivera', role: Role.DEVELOPER },
];

/**
 * (Re)builds the demo team from scratch. Visitors share the demo accounts, so whatever they
 * changed (tasks, members, profile, teams they created) is wiped and recreated.
 * Data that belongs to other users is left alone.
 */
export async function seedDemo(prisma: PrismaClient) {
  const password = await bcrypt.hash('Password123!', 12);

  await prisma.$transaction(
    async (tx) => {
      const reset = {
        password, isActive: true, avatar: null, bio: null, phone: null,
        jobTitle: null, location: null, birthDate: null,
      };
      const users = [];
      for (const p of DEMO_PEOPLE) {
        users.push(
          await tx.user.upsert({
            where: { email: p.email },
            update: { name: p.name, ...reset },
            create: { name: p.name, email: p.email, password },
          }),
        );
      }
      const [alice, bob, carlos] = users;
      const ids = users.map((u) => u.id);

      // Teams visitors created while signed in as a demo user (no outside members).
      await tx.team.deleteMany({
        where: {
          slug: { not: DEMO_TEAM_SLUG },
          members: { some: { userId: { in: ids } }, every: { userId: { in: ids } } },
        },
      });
      // Cascades to members, invitations, projects, tasks and comments.
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
      const due = (days: number) => new Date(Date.now() + days * day);
      const S = TaskStatus;
      const P = TaskPriority;

      const boards: Record<string, Array<[string, TaskStatus, TaskPriority, string | null, number | null]>> = {
        'demo-project-1': [
          ['Design new landing page',       S.DONE,        P.HIGH,   alice.id,  -6],
          ['Implement authentication flow', S.IN_PROGRESS, P.URGENT, bob.id,     2],
          ['Write API documentation',       S.TODO,        P.MEDIUM, carlos.id,  7],
          ['Setup CI/CD pipeline',          S.IN_REVIEW,   P.HIGH,   alice.id,   1],
          ['Performance optimization',      S.BACKLOG,     P.LOW,    null,    null],
          ['Mobile responsive fixes',       S.TODO,        P.MEDIUM, bob.id,    -1],
          ['Accessibility audit (WCAG AA)', S.BACKLOG,     P.MEDIUM, carlos.id, 14],
          ['SEO metadata and sitemap',      S.DONE,        P.LOW,    carlos.id, -3],
        ],
        'demo-project-2': [
          ['Define v2 navigation',          S.DONE,        P.HIGH,   bob.id,    -10],
          ['Offline mode for task list',    S.IN_PROGRESS, P.HIGH,   alice.id,    5],
          ['Push notifications',            S.TODO,        P.MEDIUM, carlos.id,  10],
          ['Dark mode polish',              S.IN_REVIEW,   P.LOW,    carlos.id,   3],
          ['Crash reporting integration',   S.BACKLOG,     P.URGENT, null,     null],
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
    },
    { timeout: 30_000 },
  );
}

// `npm run db:seed` runs this file directly; the API imports seedDemo instead.
if (require.main === module) {
  const prisma = new PrismaClient();
  seedDemo(prisma)
    .then(() => {
      console.log('Demo data ready. Accounts (password: Password123!):');
      for (const p of DEMO_PEOPLE) console.log(`  ${p.email}  ${p.role}`);
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
