const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/preone' } }
});

async function main() {
  const tenantId = '1fac9d27-88a1-4e78-90a4-8a0e38bc744f';

  // 1. Get all classrooms in this tenant
  const classrooms = await prisma.classroom.findMany({
    where: { tenantId },
    include: {
      primaryTeacher: {
        select: { id: true, email: true, fullName: true }
      },
      _count: {
        select: { students: true }
      }
    }
  });

  console.log('=== CLASSROOMS IN TENANT ===');
  for (const c of classrooms) {
    console.log(`Classroom: ${c.name} (Code: ${c.code}, ID: ${c.id})`);
    console.log(`  Branch ID: ${c.branchId}`);
    console.log(`  Primary Teacher ID: ${c.primaryTeacherId}`);
    console.log(`  Primary Teacher:`, c.primaryTeacher);
    console.log(`  Active Students Count: ${c._count.students}`);
  }

  // 2. Get all teachers in this tenant
  const tenantUsers = await prisma.tenantUser.findMany({
    where: {
      tenantId,
      OR: [{ role: 'TEACHER' }, { roles: { has: 'TEACHER' } }]
    },
    include: {
      user: {
        select: { id: true, email: true, fullName: true, status: true }
      }
    }
  });

  console.log('\n=== ALL TEACHERS IN TENANT ===');
  for (const tu of tenantUsers) {
    console.log(`Teacher: ${tu.user.fullName} <${tu.user.email}> (User ID: ${tu.user.id}, Branch ID: ${tu.branchId}, Role: ${tu.role}, Roles: [${tu.roles.join(', ')}])`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
