import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function checkDatabaseStats() {
  try {
    console.log('📊 Database Statistics\n');
    
    const stats = {
      departments: await prisma.department.count(),
      subDepartments: await prisma.subDepartment.count(),
      categories: await prisma.category.count(),
      masterAttributes: await prisma.masterAttribute.count(),
      allowedValues: await prisma.attributeAllowedValue.count(),
      categoryMappings: await prisma.categoryAttribute.count(),
    };
    
    console.log('✅ Record Counts:');
    console.log(`   Departments: ${stats.departments}`);
    console.log(`   Sub-Divisions: ${stats.subDepartments}`);
    console.log(`   Major Categories: ${stats.categories}`);
    console.log(`   Master Attributes: ${stats.masterAttributes}`);
    console.log(`   Allowed Values: ${stats.allowedValues}`);
    console.log(`   Category-Attribute Mappings: ${stats.categoryMappings}`);
    
    console.log('\n📋 Sample Data:');
    
    // Sample departments
    const depts = await prisma.department.findMany({ take: 5 });
    console.log('\nDepartments:');
    depts.forEach(d => console.log(`   ${d.code} - ${d.name}`));
    
    // Sample categories
    const cats = await prisma.category.findMany({ take: 5 });
    console.log('\nSample Categories:');
    cats.forEach(c => console.log(`   ${c.code} - ${c.name}`));
    
    // Sample attributes
    const attrs = await prisma.masterAttribute.findMany({ take: 5 });
    console.log('\nSample Attributes:');
    attrs.forEach(a => console.log(`   ${a.key} - ${a.label} (${a.category || 'other'})`));
    
    console.log('\n✅ Database verification complete!');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStats();
