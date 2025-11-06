/**
 * Admin Controller - Hierarchy Management APIs
 * Complete CRUD operations for managing the fashion hierarchy
 */

import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { z } from 'zod';

const prisma = new PrismaClient({
  log: [], // Disable logging to save memory
  errorFormat: 'minimal', // Minimal error format to save memory
});

// ═══════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════

const DepartmentSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const SubDepartmentSchema = z.object({
  departmentId: z.number().int(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const CategorySchema = z.object({
  subDepartmentId: z.number().int(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const MasterAttributeSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum(['TEXT', 'SELECT', 'NUMBER']),
  description: z.string().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const AllowedValueSchema = z.object({
  attributeId: z.number().int(),
  shortForm: z.string().min(1).max(100),
  fullForm: z.string().min(1).max(200),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// ═══════════════════════════════════════════════════════
// DEPARTMENTS API
// ═══════════════════════════════════════════════════════

export const getAllDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { includeSubDepts } = req.query;
    
    const departments = await prisma.department.findMany({
      orderBy: { displayOrder: 'asc' },
      include: includeSubDepts === 'true' ? {
        subDepartments: {
          orderBy: { displayOrder: 'asc' },
        },
      } : undefined,
    });
    
    res.json({ success: true, data: departments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDepartmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const department = await prisma.department.findUnique({
      where: { id: parseInt(id) },
      include: {
        subDepartments: {
          orderBy: { displayOrder: 'asc' },
          include: {
            categories: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });
    
    if (!department) {
      res.status(404).json({ success: false, error: 'Department not found' });
      return;
    }
    
    res.json({ success: true, data: department });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = DepartmentSchema.parse(req.body);
    
    const department = await prisma.department.create({
      data: validated,
    });
    
    res.status(201).json({ success: true, data: department });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = DepartmentSchema.partial().parse(req.body);
    
    const department = await prisma.department.update({
      where: { id: parseInt(id) },
      data: validated,
    });
    
    res.json({ success: true, data: department });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await prisma.department.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// SUB-DEPARTMENTS API
// ═══════════════════════════════════════════════════════

export const getAllSubDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { departmentId } = req.query;
    
    const subDepartments = await prisma.subDepartment.findMany({
      where: departmentId ? { departmentId: parseInt(departmentId as string) } : undefined,
      orderBy: { displayOrder: 'asc' },
      include: {
        department: true,
      },
    });
    
    res.json({ success: true, data: subDepartments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSubDepartmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const subDepartment = await prisma.subDepartment.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: true,
        categories: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    
    if (!subDepartment) {
      res.status(404).json({ success: false, error: 'Sub-department not found' });
      return;
    }
    
    res.json({ success: true, data: subDepartment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createSubDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = SubDepartmentSchema.parse(req.body);
    
    const subDepartment = await prisma.subDepartment.create({
      data: validated,
      include: {
        department: true,
      },
    });
    
    res.status(201).json({ success: true, data: subDepartment });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSubDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = SubDepartmentSchema.partial().parse(req.body);
    
    const subDepartment = await prisma.subDepartment.update({
      where: { id: parseInt(id) },
      data: validated,
      include: {
        department: true,
      },
    });
    
    res.json({ success: true, data: subDepartment });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteSubDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await prisma.subDepartment.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ success: true, message: 'Sub-department deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// CATEGORIES API
// ═══════════════════════════════════════════════════════

export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { departmentId, subDepartmentId, search, page = '1', limit = '50' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = {};
    
    if (subDepartmentId) {
      where.subDepartmentId = parseInt(subDepartmentId as string);
    } else if (departmentId) {
      where.subDepartment = {
        departmentId: parseInt(departmentId as string),
      };
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { displayOrder: 'asc' },
        include: {
          subDepartment: {
            include: {
              department: true,
            },
          },
        },
        skip,
        take: limitNum,
      }),
      prisma.category.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: categories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        subDepartment: {
          include: {
            department: true,
          },
        },
        attributes: {
          include: {
            attribute: {
              include: {
                allowedValues: true,
              },
            },
          },
        },
      },
    });
    
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get category by code with all attributes
 * Used by frontend extraction flow
 */
export const getCategoryByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    
    const category = await prisma.category.findUnique({
      where: { code: code },
      include: {
        subDepartment: {
          include: {
            department: true,
          },
        },
        attributes: {
          orderBy: {
            displayOrder: 'asc',
          },
          include: {
            attribute: {
              include: {
                allowedValues: {
                  orderBy: {
                    displayOrder: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!category) {
      res.status(404).json({ success: false, error: `Category with code '${code}' not found` });
      return;
    }
    
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get category with ALL master attributes (showing enabled/disabled status)
 * This is used by the admin panel matrix to show all 44 attributes with toggles
 */
export const getCategoryWithAllAttributes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);

    // Get the category
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        subDepartment: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!category) {
      res.status(404).json({ success: false, error: `Category with ID ${id} not found` });
      return;
    }

    // Get ALL master attributes
    const allAttributes = await prisma.masterAttribute.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        allowedValues: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    // Get existing category-attribute mappings
    const existingMappings = await prisma.categoryAttribute.findMany({
      where: { categoryId: categoryId },
    });

    // Create a map for quick lookup
    const mappingMap = new Map(
      existingMappings.map(m => [m.attributeId, m])
    );

    // Merge: for each master attribute, check if mapping exists
    const attributesWithStatus = allAttributes.map(attr => {
      const mapping = mappingMap.get(attr.id);
      return {
        attributeId: attr.id,
        attributeKey: attr.key,
        attributeLabel: attr.label,
        attributeType: attr.type,
        allowedValues: attr.allowedValues,
        isEnabled: mapping?.isEnabled || false,
        isRequired: mapping?.isRequired || false,
        displayOrder: mapping?.displayOrder || attr.displayOrder,
        defaultValue: mapping?.defaultValue || null,
        hasMapping: !!mapping,  // NEW: indicates if mapping exists in DB
      };
    });

    res.json({
      success: true,
      data: {
        ...category,
        allAttributes: attributesWithStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = CategorySchema.parse(req.body);
    
    const category = await prisma.category.create({
      data: validated,
      include: {
        subDepartment: {
          include: {
            department: true,
          },
        },
      },
    });
    
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = CategorySchema.partial().parse(req.body);
    
    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: validated,
      include: {
        subDepartment: {
          include: {
            department: true,
          },
        },
      },
    });
    
    res.json({ success: true, data: category });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await prisma.category.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateCategoryAttributes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { attributeIds } = req.body;
    
    if (!Array.isArray(attributeIds)) {
      res.status(400).json({ success: false, error: 'attributeIds must be an array' });
      return;
    }
    
    await prisma.categoryAttribute.deleteMany({
      where: { categoryId: parseInt(id) },
    });
    
    const mappings = attributeIds.map((attrId: number, index: number) => ({
      categoryId: parseInt(id),
      attributeId: attrId,
      displayOrder: index,
      isRequired: false,
      isEnabled: true,
    }));
    
    await prisma.categoryAttribute.createMany({
      data: mappings,
    });
    
    res.json({ success: true, message: 'Category attributes updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update single category-attribute mapping
export const updateCategoryAttributeMapping = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, attributeId } = req.params;
    const { isEnabled, isRequired, displayOrder, defaultValue } = req.body;
    
    // Use upsert to create if doesn't exist, update if exists
    const mapping = await prisma.categoryAttribute.upsert({
      where: {
        categoryId_attributeId: {
          categoryId: parseInt(categoryId),
          attributeId: parseInt(attributeId),
        },
      },
      update: {
        ...(isEnabled !== undefined && { isEnabled }),
        ...(isRequired !== undefined && { isRequired }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(defaultValue !== undefined && { defaultValue }),
        updatedAt: new Date(),
      },
      create: {
        categoryId: parseInt(categoryId),
        attributeId: parseInt(attributeId),
        isEnabled: isEnabled ?? false,
        isRequired: isRequired ?? false,
        displayOrder: displayOrder ?? 0,
        defaultValue: defaultValue ?? null,
      },
    });
    
    res.json({ success: true, data: mapping, message: 'Mapping updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add attribute to category
export const addAttributeToCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const { attributeId, isEnabled, isRequired, displayOrder, defaultValue } = req.body;
    
    const mapping = await prisma.categoryAttribute.create({
      data: {
        categoryId: parseInt(categoryId),
        attributeId,
        isEnabled: isEnabled ?? true,
        isRequired: isRequired ?? false,
        displayOrder: displayOrder ?? 0,
        defaultValue: defaultValue ?? null,
      },
      include: {
        attribute: {
          include: {
            allowedValues: true,
          },
        },
      },
    });
    
    res.status(201).json({ success: true, data: mapping });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Remove attribute from category
export const removeAttributeFromCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, attributeId } = req.params;
    
    await prisma.categoryAttribute.deleteMany({
      where: {
        categoryId: parseInt(categoryId),
        attributeId: parseInt(attributeId),
      },
    });
    
    res.json({ success: true, message: 'Attribute removed from category' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// MASTER ATTRIBUTES API
// ═══════════════════════════════════════════════════════

export const getAllMasterAttributes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { includeValues } = req.query;
    
    const attributes = await prisma.masterAttribute.findMany({
      orderBy: { displayOrder: 'asc' },
      include: includeValues === 'true' ? {
        allowedValues: {
          orderBy: { displayOrder: 'asc' },
        },
      } : undefined,
    });
    
    res.json({ success: true, data: attributes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMasterAttributeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const attribute = await prisma.masterAttribute.findUnique({
      where: { id: parseInt(id) },
      include: {
        allowedValues: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    
    if (!attribute) {
      res.status(404).json({ success: false, error: 'Attribute not found' });
      return;
    }
    
    res.json({ success: true, data: attribute });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createMasterAttribute = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = MasterAttributeSchema.parse(req.body);
    
    const attribute = await prisma.masterAttribute.create({
      data: validated,
    });
    
    res.status(201).json({ success: true, data: attribute });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateMasterAttribute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = MasterAttributeSchema.partial().parse(req.body);
    
    const attribute = await prisma.masterAttribute.update({
      where: { id: parseInt(id) },
      data: validated,
    });
    
    res.json({ success: true, data: attribute });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteMasterAttribute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await prisma.masterAttribute.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ success: true, message: 'Attribute deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addAllowedValue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = AllowedValueSchema.omit({ attributeId: true }).parse(req.body);
    
    const allowedValue = await prisma.attributeAllowedValue.create({
      data: {
        ...validated,
        attributeId: parseInt(id),
      },
    });
    
    res.status(201).json({ success: true, data: allowedValue });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.issues });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteAllowedValue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { valueId } = req.params;
    
    await prisma.attributeAllowedValue.delete({
      where: { id: parseInt(valueId) },
    });
    
    res.json({ success: true, message: 'Allowed value deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════
// HIERARCHY API
// ═══════════════════════════════════════════════════════

export const getHierarchyTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        subDepartments: {
          orderBy: { displayOrder: 'asc' },
          include: {
            categories: {
              orderBy: { displayOrder: 'asc' },
              include: {
                attributes: {
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    attribute: {
                      include: {
                        allowedValues: {
                          where: { isActive: true },
                          orderBy: { displayOrder: 'asc' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    
    // Count totals
    const totalCategories = departments.reduce((acc, dept) => 
      acc + dept.subDepartments.reduce((subAcc, subDept) => 
        subAcc + subDept.categories.length, 0), 0);
    
    const totalAttributes = await prisma.masterAttribute.count();
    
    res.json({ 
      success: true, 
      data: {
        departments,
        totalCategories,
        totalAttributes
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const exportHierarchy = async (req: Request, res: Response): Promise<void> => {
  try {
    const [departments, attributes] = await Promise.all([
      prisma.department.findMany({
        include: {
          subDepartments: {
            include: {
              categories: {
                include: {
                  attributes: {
                    include: {
                      attribute: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.masterAttribute.findMany({
        include: {
          allowedValues: true,
        },
      }),
    ]);
    
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      departments,
      masterAttributes: attributes,
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=hierarchy-export.json');
    res.json(exportData);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await Promise.all([
      prisma.department.count(),
      prisma.subDepartment.count(),
      prisma.category.count(),
      prisma.masterAttribute.count(),
      prisma.attributeAllowedValue.count(),
    ]);
    
    res.json({
      success: true,
      data: {
        departments: stats[0],
        subDepartments: stats[1],
        categories: stats[2],
        masterAttributes: stats[3],
        allowedValues: stats[4],
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
