import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const counts = {
      departments: await prisma.department.count(),
      subDepartments: await prisma.subDepartment.count(),
      categories: await prisma.category.count(),
      masterAttributes: await prisma.masterAttribute.count(),
      attributeValues: await prisma.attributeAllowedValue.count(),
      categoryAttributes: await prisma.categoryAttribute.count(),
    };
    
    console.log('\n📊 Database Status:\n');
    console.log('Departments:', counts.departments);
    console.log('Sub-Departments:', counts.subDepartments);
    console.log('Categories:', counts.categories);
    console.log('Master Attributes:', counts.masterAttributes);
    console.log('Attribute Values:', counts.attributeValues);
    console.log('Category-Attribute Mappings:', counts.categoryAttributes);
    console.log('\n');
    
    if (counts.categoryAttributes === 0) {
      console.log('❌ CategoryAttribute mappings are MISSING!');
      console.log('💡 Run: npm run seed\n');
    } else {
      console.log('✅ All data seeded successfully!\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
