// Category CRUD Endpoints
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { logAudit, AuditActions } from '../lib/audit';

const categories = new Hono();

// Validation schemas
const createCategorySchema = z.object({
  parentId: z.string().uuid('Invalid parent category ID').optional(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  position: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const updateCategorySchema = z.object({
  parentId: z.string().uuid('Invalid parent category ID').optional(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  description: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// Helper function to build category tree
function buildCategoryTree(categories: any[], parentId: string | null = null): any[] {
  return categories
    .filter((cat) => cat.parentId === parentId)
    .map((cat) => ({
      ...cat,
      children: buildCategoryTree(categories, cat.id),
    }));
}

// Helper function to calculate level and path for category
async function calculateCategoryPath(categoryId: string): Promise<{ level: number; path: string }> {
  const path: string[] = [];
  let currentCategory = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true, parentId: true, name: true },
  });

  while (currentCategory) {
    path.unshift(currentCategory.id);
    if (currentCategory.parentId) {
      currentCategory = await db.category.findUnique({
        where: { id: currentCategory.parentId },
        select: { id: true, parentId: true, name: true },
      });
    } else {
      currentCategory = null;
    }
  }

  return {
    level: path.length - 1,
    path: '/' + path.join('/'),
  };
}

// ============================================
// GET /api/v1/categories - List categories (paginated, tenant-scoped)
// ============================================
categories.get('/', authMiddleware, requirePermission('products.read'), async (c) => {
  try {
    const user = c.get('user');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const search = c.req.query('search') || '';
    const tree = c.req.query('tree') === 'true';
    const parentId = c.req.query('parent_id');

    const skip = (page - 1) * limit;

    // Build where clause - only categories from the same tenant
    const where: any = {
      tenantId: user.tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (parentId !== undefined) {
      where.parentId = parentId === '' ? null : parentId;
    }

    const [categoriesList, total] = await Promise.all([
      db.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          parentId: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          level: true,
          path: true,
          position: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      }),
      db.category.count({ where }),
    ]);

    // Return as tree if requested
    if (tree) {
      const treeData = buildCategoryTree(categoriesList);
      return c.json({
        data: treeData,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    }

    return c.json({
      data: categoriesList,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// ============================================
// GET /api/v1/categories/tree - Get category tree (no pagination)
// ============================================
categories.get('/tree', authMiddleware, requirePermission('products.read'), async (c) => {
  try {
    const user = c.get('user');

    const categoriesList = await db.category.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
      },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        level: true,
        path: true,
        position: true,
        isActive: true,
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    const treeData = buildCategoryTree(categoriesList);

    return c.json({ data: treeData });
  } catch (error) {
    console.error('Error fetching category tree:', error);
    return c.json({ error: 'Failed to fetch category tree' }, 500);
  }
});

// ============================================
// GET /api/v1/categories/:id - Get category by ID
// ============================================
categories.get('/:id', authMiddleware, requirePermission('products.read'), async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    const category = await db.category.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            position: true,
            isActive: true,
            _count: {
              select: {
                products: true,
              },
            },
          },
          orderBy: [{ position: 'asc' }, { name: 'asc' }],
        },
        products: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }

    return c.json({ data: category });
  } catch (error) {
    console.error('Error fetching category:', error);
    return c.json({ error: 'Failed to fetch category' }, 500);
  }
});

// ============================================
// GET /api/v1/categories/slug/:slug - Get category by slug
// ============================================
categories.get('/slug/:slug', authMiddleware, requirePermission('products.read'), async (c) => {
  try {
    const user = c.get('user');
    const slug = c.req.param('slug');

    const category = await db.category.findFirst({
      where: {
        slug,
        tenantId: user.tenantId,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            position: true,
            isActive: true,
          },
          orderBy: [{ position: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }

    return c.json({ data: category });
  } catch (error) {
    console.error('Error fetching category by slug:', error);
    return c.json({ error: 'Failed to fetch category' }, 500);
  }
});

// ============================================
// POST /api/v1/categories - Create category
// ============================================
categories.post('/', authMiddleware, requirePermission('categories.manage'), async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();

    // Validate request body
    const result = createCategorySchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.issues }, 400);
    }

    const { parentId, name, slug, description, imageUrl, position, isActive } = result.data;

    // If parentId is provided, verify it exists and belongs to tenant
    if (parentId) {
      const parent = await db.category.findFirst({
        where: {
          id: parentId,
          tenantId: currentUser.tenantId,
        },
      });

      if (!parent) {
        return c.json({ error: 'Parent category not found' }, 404);
      }

      // Prevent creating a category as its own parent (circular reference)
      if (parentId === currentUser.id) {
        return c.json({ error: 'Cannot set category as its own parent' }, 400);
      }
    }

    // Check if slug already exists in this tenant
    const existingCategory = await db.category.findFirst({
      where: {
        slug,
        tenantId: currentUser.tenantId,
      },
    });

    if (existingCategory) {
      return c.json({ error: 'Category with this slug already exists' }, 400);
    }

    // Calculate level and path
    const { level, path } = parentId
      ? await calculateCategoryPath(parentId)
      : { level: 0, path: null };

    // Create category
    const newCategory = await db.category.create({
      data: {
        parentId,
        name,
        slug,
        description,
        imageUrl,
        level,
        path,
        position,
        isActive,
        tenantId: currentUser.tenantId,
      },
    });

    // Update path for newly created category (now we have the ID)
    const finalPath = path ? `${path}/${newCategory.id}` : `/${newCategory.id}`;
    await db.category.update({
      where: { id: newCategory.id },
      data: { path: finalPath },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.CATEGORY_CREATED,
      entity: 'category',
      entityId: newCategory.id,
      metadata: {
        categoryName: newCategory.name,
        categorySlug: newCategory.slug,
        createdBy: currentUser.email,
      },
    });

    return c.json(
      {
        message: 'Category created successfully',
        data: { ...newCategory, path: finalPath },
      },
      201
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return c.json({ error: 'Failed to create category' }, 500);
  }
});

// ============================================
// PATCH /api/v1/categories/:id - Update category
// ============================================
categories.patch('/:id', authMiddleware, requirePermission('categories.manage'), async (c) => {
  try {
    const currentUser = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();

    // Validate request body
    const result = updateCategorySchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.issues }, 400);
    }

    // Check if category exists and is from the same tenant
    const existingCategory = await db.category.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existingCategory) {
      return c.json({ error: 'Category not found' }, 404);
    }

    // If changing slug, check if new slug already exists
    if (result.data.slug && result.data.slug !== existingCategory.slug) {
      const slugExists = await db.category.findFirst({
        where: {
          slug: result.data.slug,
          tenantId: currentUser.tenantId,
          id: { not: id },
        },
      });

      if (slugExists) {
        return c.json({ error: 'Category with this slug already exists' }, 400);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updatedCategory: any;

    // If changing parent, verify it exists
    if (result.data.parentId !== undefined) {
      if (result.data.parentId) {
        const parent = await db.category.findFirst({
          where: {
            id: result.data.parentId,
            tenantId: currentUser.tenantId,
          },
        });

        if (!parent) {
          return c.json({ error: 'Parent category not found' }, 404);
        }

        // Prevent setting a category as its own parent (circular reference)
        if (result.data.parentId === id) {
          return c.json({ error: 'Cannot set category as its own parent' }, 400);
        }

        // Check if the new parent is not a descendant of this category
        const isDescendant = await checkIsDescendant(id, result.data.parentId);
        if (isDescendant) {
          return c.json({ error: 'Cannot set a descendant as parent' }, 400);
        }
      }

      // Recalculate level and path if parent changed
      const { level, path } = result.data.parentId
        ? await calculateCategoryPath(result.data.parentId)
        : { level: 0, path: null };

      // Create update data with level and path
      const updateData: any = { ...result.data, level, path };

      // Update category
      updatedCategory = await db.category.update({
        where: { id },
        data: updateData,
      });
    } else {
      // Update category (no parent change)
      updatedCategory = await db.category.update({
        where: { id },
        data: result.data,
      });
    }

    // Update path for the category (append current ID)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalPath = (updatedCategory as any).path ? `${(updatedCategory as any).path}/${id}` : `/${id}`;
    updatedCategory = await db.category.update({
      where: { id },
      data: { path: finalPath },
    }) as any;

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.CATEGORY_UPDATED,
      entity: 'category',
      entityId: id,
      metadata: {
        changes: result.data,
        updatedBy: currentUser.email,
      },
    });

    return c.json({
      message: 'Category updated successfully',
      data: { ...updatedCategory },
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return c.json({ error: 'Failed to update category' }, 500);
  }
});

// ============================================
// DELETE /api/v1/categories/:id - Delete category
// ============================================
categories.delete('/:id', authMiddleware, requirePermission('categories.manage'), async (c) => {
  try {
    const currentUser = c.get('user');
    const id = c.req.param('id');

    // Check if category exists and is from the same tenant
    const existingCategory = await db.category.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!existingCategory) {
      return c.json({ error: 'Category not found' }, 404);
    }

    // Check if category has products
    if (existingCategory._count.products > 0) {
      return c.json({
        error: 'Cannot delete category with products',
        message: 'Please move or delete the products first',
      }, 400);
    }

    // Check if category has children
    if (existingCategory._count.children > 0) {
      return c.json({
        error: 'Cannot delete category with subcategories',
        message: 'Please move or delete the subcategories first',
      }, 400);
    }

    // Delete category
    await db.category.delete({
      where: { id },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.CATEGORY_DELETED,
      entity: 'category',
      entityId: id,
      metadata: {
        categoryName: existingCategory.name,
        deletedBy: currentUser.email,
      },
    });

    return c.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json({ error: 'Failed to delete category' }, 500);
  }
});

// ============================================
// Helper function to check if a category is a descendant of another
// ============================================
async function checkIsDescendant(ancestorId: string, potentialDescendantId: string): Promise<boolean> {
  let currentId: string | null = potentialDescendantId;
  const maxIterations = 100; // Prevent infinite loops
  let iterations = 0;

  while (currentId && iterations < maxIterations) {
    if (currentId === ancestorId) {
      return true;
    }

    const cat = await db.category.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    }) as { parentId: string | null } | null;

    currentId = cat?.parentId || null;
    iterations++;
  }

  return false;
}

export default categories;
