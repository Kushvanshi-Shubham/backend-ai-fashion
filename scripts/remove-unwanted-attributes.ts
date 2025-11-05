/**
 * Remove unwanted duplicate attributes
 * - PRODUCT SOURCE
 * - MAXIMUM RETAIL PRICE
 * - COLLAR COLLAR COLLAR (duplicate collar entries)
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const ATTRIBUTES_TO_REMOVE = [
  'PRODUCT SOURCE',
  'MAXIMUM RETAIL PRICE',
  'COLLAR COLLAR COLLAR'
];

async function main() {
  console.log('🗑️  Removing unwanted attributes...\n');

  for (const attrName of ATTRIBUTES_TO_REMOVE) {
    try {
      // Find attribute by label (case-insensitive)
      const attribute = await prisma.masterAttribute.findFirst({
        where: {
          label: {
            equals: attrName,
            mode: 'insensitive'
          }
        }
      });

      if (!attribute) {
        console.log(`⏭️  Not found: "${attrName}"`);
        continue;
      }

      console.log(`🔍 Found: "${attribute.label}" (key: ${attribute.key}, id: ${attribute.id})`);

      // Count how many categories use this attribute
      const usageCount = await prisma.categoryAttribute.count({
        where: { attributeId: attribute.id }
      });

      console.log(`   Used in ${usageCount} category mappings`);

      // Delete category mappings first (CASCADE will handle this but being explicit)
      if (usageCount > 0) {
        await prisma.categoryAttribute.deleteMany({
          where: { attributeId: attribute.id }
        });
        console.log(`   ✅ Deleted ${usageCount} category mappings`);
      }

      // Delete the attribute itself (will also delete allowed values via CASCADE)
      await prisma.masterAttribute.delete({
        where: { id: attribute.id }
      });

      console.log(`   ✅ Deleted attribute: "${attribute.label}"\n`);

    } catch (error) {
      console.error(`❌ Failed to delete "${attrName}":`, error);
    }
  }

  console.log('✅ Cleanup complete!\n');

  // Show summary
  const totalAttributes = await prisma.masterAttribute.count();
  const totalMappings = await prisma.categoryAttribute.count();
  
  console.log('📊 Database Summary:');
  console.log(`   Total attributes: ${totalAttributes}`);
  console.log(`   Total category mappings: ${totalMappings}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
