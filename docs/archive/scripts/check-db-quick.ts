import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('\n🔍 Checking database state...\n');

    const departmentss = await prisma.department.count();
    const subDepartments = await prisma.subDepartment.count();
    const categories = await prisma.category.count();
    const masterAttributes = await prisma.masterAttribute.count();
    const allowedValues = await prisma.attributeAllowedValue.count();
    const categoryAttributes = await prisma.categoryAttribute.count();

    console.log('📊 Database Summary:');
    console.log(`   Departments: ${departmentss}`);
    console.log(`   Sub-Departments: ${subDepartments}`);
    console.log(`   Categories: ${categories}`);
    console.log(`   Master Attributes: ${masterAttributes}`);
    console.log(`   Allowed Values: ${allowedValues}`);
    console.log(`   Category Attributes: ${categoryAttributes}`);

    if (masterAttributes > 0) {
      console.log('\n📝 Sample Attributes:');
      const attrs = await prisma.masterAttribute.findMany({
        take: 10,
        select: { key: true, label: true }
      });
      attrs.forEach(attr => console.log(`   - ${attr.key}: ${attr.label}`));
    }

    console.log('\n✅ Check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
