const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/preone' } }
});

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: { contains: 'teacher', mode: 'insensitive' }
    },
    include: {
      memberships: true,
      taughtClasses: true
    }
  });

  console.log(`Found ${users.length} users with 'teacher' in email:`);
  for (const u of users) {
    console.log(`- ${u.fullName} <${u.email}> (ID: ${u.id})`);
    console.log(`  Memberships:`, u.memberships.map(m => `Tenant: ${m.tenantId}, Branch: ${m.branchId}, Role: ${m.role}, Roles: [${m.roles.join(', ')}]`));
    console.log(`  Taught Classes:`, u.taughtClasses.map(c => `${c.name} (${c.code}, Branch: ${c.branchId})`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
