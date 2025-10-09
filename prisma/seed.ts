import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create test users
  const testUsers = [
    {
      email: 'admin@test.com',
      password: 'admin123',
      role: 'ADMIN' as const,
    },
    {
      email: 'user@test.com',
      password: 'user123',
      role: 'USER' as const,
    },
    {
      email: 'demo@test.com',
      password: 'demo123',
      role: 'USER' as const,
    },
  ];

  for (const userData of testUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
      },
    });

    console.log(`✅ Created user: ${user.email} (${user.role})`);
  }

  // Create some sample uploads for testing
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@test.com' }
  });

  const regularUser = await prisma.user.findUnique({
    where: { email: 'user@test.com' }
  });

  if (adminUser && regularUser) {
    // Create sample uploads
    const sampleUploads = [
      {
        filename: 'sample-shirt.jpg',
        path: '/uploads/sample-shirt.jpg',
        status: 'COMPLETED' as const,
        userId: regularUser.id,
      },
      {
        filename: 'sample-dress.jpg',
        path: '/uploads/sample-dress.jpg',
        status: 'COMPLETED' as const,
        userId: regularUser.id,
      },
      {
        filename: 'sample-shoes.jpg',
        path: '/uploads/sample-shoes.jpg',
        status: 'PROCESSING' as const,
        userId: adminUser.id,
      },
    ];

    for (const uploadData of sampleUploads) {
      const upload = await prisma.upload.create({
        data: uploadData,
      });

      console.log(`✅ Created upload: ${upload.filename} (${upload.status})`);

      // Add extraction results for completed uploads
      if (upload.status === 'COMPLETED') {
        await prisma.extractionResult.create({
          data: {
            uploadId: upload.id,
            data: {
              category: 'clothing',
              color: 'blue',
              size: 'M',
              material: 'cotton',
            },
            rawOutput: 'AI extraction completed successfully',
          },
        });

        console.log(`✅ Created extraction result for: ${upload.filename}`);
      }
    }
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });