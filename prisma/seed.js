const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user: admin@test.com / admin123');

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      password: userPassword,
      role: 'USER',
    },
  });
  console.log('✅ Created regular user: user@test.com / user123');

  // Create demo user
  const demoPassword = await bcrypt.hash('demo123', 10);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@test.com' },
    update: {},
    create: {
      email: 'demo@test.com',
      password: demoPassword,
      role: 'USER',
    },
  });
  console.log('✅ Created demo user: demo@test.com / demo123');

  // Create sample uploads
  const upload1 = await prisma.upload.create({
    data: {
      filename: 'sample-shirt.jpg',
      path: '/uploads/sample-shirt.jpg',
      status: 'COMPLETED',
      userId: user.id,
    },
  });

  const upload2 = await prisma.upload.create({
    data: {
      filename: 'sample-dress.jpg',
      path: '/uploads/sample-dress.jpg',
      status: 'COMPLETED',
      userId: user.id,
    },
  });

  console.log('✅ Created sample uploads');

  // Create extraction results
  await prisma.extractionResult.create({
    data: {
      uploadId: upload1.id,
      data: {
        category: 'clothing',
        color: 'blue',
        size: 'M',
        material: 'cotton',
        brand: 'Nike',
      },
      rawOutput: 'AI extraction completed successfully',
    },
  });

  await prisma.extractionResult.create({
    data: {
      uploadId: upload2.id,
      data: {
        category: 'clothing',
        color: 'red',
        size: 'L',
        material: 'silk',
        brand: 'Zara',
      },
      rawOutput: 'AI extraction completed successfully',
    },
  });

  console.log('✅ Created extraction results');
  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Test Accounts:');
  console.log('Admin: admin@test.com / admin123');
  console.log('User: user@test.com / user123');
  console.log('Demo: demo@test.com / demo123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });