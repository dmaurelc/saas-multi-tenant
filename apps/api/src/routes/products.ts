// Product CRUD Endpoints
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { logAudit, AuditActions } from '../lib/audit';

const products = new Hono();

// Validation schemas
const createProductSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  metaTitle: z.string().max(255).optional(),
  metaDesc: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateProductSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  description: z.string().optional(),
  metaTitle: z.string().max(255).optional(),
  metaDesc: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createVariantSchema = z.object({
  sku: z.string().max(100).optional(),
  name: z.string().min(1).max(255),
  price: z.string().or(z.number()).transform((val) => typeof val === 'string' ? parseFloat(val) : val),
  comparePrice: z.string().or(z.number()).nullable().transform((val) => val === null ? null : (typeof val === 'string' ? parseFloat(val) : val)).optional(),
  stock: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const updateVariantSchema = z.object({
  sku: z.string().max(100).optional(),
  name: z.string().min(1).max(255).optional(),
  price: z.string().or(z.number()).transform((val) => typeof val === 'string' ? parseFloat(val) : val).optional(),
  comparePrice: z.string().or(z.number()).nullable().transform((val) => val === null ? null : (typeof val === 'string' ? parseFloat(val) : val)).optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const createImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  alt: z.string().max(500).optional(),
  position: z.number().int().min(0).default(0),
  variantId: z.string().uuid('Invalid variant ID').optional(),
});

// ============================================
// GET /api/v1/products - List products (paginated, tenant-scoped)
// ============================================
products.get('/', authMiddleware, requirePermission('products.read'), async (c) => {
  try {
    const user = c.get('user');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const search = c.req.query('search') || '';
    const categoryId = c.req.query('category_id');
    const isActive = c.req.query('is_active');

    const skip = (page - 1) * limit;

    // Build where clause - only products from the same tenant
    const where: any = {
      tenantId: user.tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [productsList, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variants: {
            select: {
              id: true,
              sku: true,
              name: true,
              price: true,
              comparePrice: true,
              stock: true,
              isActive: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          images: {
            select: {
              id: true,
              url: true,
              alt: true,
              position: true,
              variantId: true,
            },
            orderBy: { position: 'asc' },
          },
        },
      }),
      db.product.count({ where }),
    ]);

    return c.json({
      data: productsList,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

// ============================================
// GET /api/v1/products/:id - Get product by ID
// ============================================
products.get('/:id', authMiddleware, requirePermission('products.read'), async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    const product = await db.product.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            comparePrice: true,
            stock: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            position: true,
            variantId: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    return c.json({ data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json({ error: 'Failed to fetch product' }, 500);
  }
});

// ============================================
// GET /api/v1/products/slug/:slug - Get product by slug
// ============================================
products.get('/slug/:slug', authMiddleware, requirePermission('products.read'), async (c) => {
  try {
    const user = c.get('user');
    const slug = c.req.param('slug');

    const product = await db.product.findFirst({
      where: {
        slug,
        tenantId: user.tenantId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            comparePrice: true,
            stock: true,
            isActive: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            position: true,
            variantId: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    return c.json({ data: product });
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return c.json({ error: 'Failed to fetch product' }, 500);
  }
});

// ============================================
// POST /api/v1/products - Create product
// ============================================
products.post('/', authMiddleware, requirePermission('products.create'), async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();

    // Validate request body
    const result = createProductSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.issues }, 400);
    }

    const { categoryId, name, slug, description, metaTitle, metaDesc, isActive } = result.data;

    // Verify category exists and belongs to tenant
    const category = await db.category.findFirst({
      where: {
        id: categoryId,
        tenantId: currentUser.tenantId,
      },
    });

    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }

    // Check if slug already exists in this tenant
    const existingProduct = await db.product.findFirst({
      where: {
        slug,
        tenantId: currentUser.tenantId,
      },
    });

    if (existingProduct) {
      return c.json({ error: 'Product with this slug already exists' }, 400);
    }

    // Create product
    const newProduct = await db.product.create({
      data: {
        categoryId,
        name,
        slug,
        description,
        metaTitle,
        metaDesc,
        isActive,
        tenantId: currentUser.tenantId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.PRODUCT_CREATED,
      entity: 'product',
      entityId: newProduct.id,
      metadata: {
        productName: newProduct.name,
        productSlug: newProduct.slug,
        createdBy: currentUser.email,
      },
    });

    return c.json(
      {
        message: 'Product created successfully',
        data: newProduct,
      },
      201
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

// ============================================
// PATCH /api/v1/products/:id - Update product
// ============================================
products.patch('/:id', authMiddleware, requirePermission('products.update'), async (c) => {
  try {
    const currentUser = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();

    // Validate request body
    const result = updateProductSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.issues }, 400);
    }

    // Check if product exists and is from the same tenant
    const existingProduct = await db.product.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existingProduct) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // If changing slug, check if new slug already exists
    if (result.data.slug && result.data.slug !== existingProduct.slug) {
      const slugExists = await db.product.findFirst({
        where: {
          slug: result.data.slug,
          tenantId: currentUser.tenantId,
          id: { not: id },
        },
      });

      if (slugExists) {
        return c.json({ error: 'Product with this slug already exists' }, 400);
      }
    }

    // If changing category, verify it exists
    if (result.data.categoryId) {
      const category = await db.category.findFirst({
        where: {
          id: result.data.categoryId,
          tenantId: currentUser.tenantId,
        },
      });

      if (!category) {
        return c.json({ error: 'Category not found' }, 404);
      }
    }

    // Update product
    const updatedProduct = await db.product.update({
      where: { id },
      data: result.data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.PRODUCT_UPDATED,
      entity: 'product',
      entityId: id,
      metadata: {
        changes: result.data,
        updatedBy: currentUser.email,
      },
    });

    return c.json({
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

// ============================================
// DELETE /api/v1/products/:id - Soft delete product (set isActive = false)
// ============================================
products.delete('/:id', authMiddleware, requirePermission('products.delete'), async (c) => {
  try {
    const currentUser = c.get('user');
    const id = c.req.param('id');

    // Check if product exists and is from the same tenant
    const existingProduct = await db.product.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existingProduct) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // Soft delete (set isActive = false)
    await db.product.update({
      where: { id },
      data: { isActive: false },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.PRODUCT_DELETED,
      entity: 'product',
      entityId: id,
      metadata: {
        productName: existingProduct.name,
        deletedBy: currentUser.email,
      },
    });

    return c.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

// ============================================
// POST /api/v1/products/:id/variants - Add variant to product
// ============================================
products.post('/:id/variants', authMiddleware, requirePermission('products.create'), async (c) => {
  try {
    const currentUser = c.get('user');
    const productId = c.req.param('id');
    const body = await c.req.json();

    // Validate request body
    const result = createVariantSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.issues }, 400);
    }

    // Check if product exists and is from the same tenant
    const product = await db.product.findFirst({
      where: {
        id: productId,
        tenantId: currentUser.tenantId,
      },
    });

    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    const { sku, name, price, comparePrice, stock, isActive } = result.data;

    // Check if SKU already exists
    if (sku) {
      const existingSku = await db.productVariant.findFirst({
        where: { sku },
      });

      if (existingSku) {
        return c.json({ error: 'SKU already exists' }, 400);
      }
    }

    // Create variant
    const newVariant = await db.productVariant.create({
      data: {
        productId,
        tenantId: currentUser.tenantId,
        sku,
        name,
        price,
        comparePrice,
        stock,
        isActive,
      },
    });

    return c.json(
      {
        message: 'Variant created successfully',
        data: newVariant,
      },
      201
    );
  } catch (error) {
    console.error('Error creating variant:', error);
    return c.json({ error: 'Failed to create variant' }, 500);
  }
});

// ============================================
// PATCH /api/v1/products/:productId/variants/:variantId - Update variant
// ============================================
products.patch('/:productId/variants/:variantId', authMiddleware, requirePermission('products.update'), async (c) => {
  try {
    const currentUser = c.get('user');
    const productId = c.req.param('productId');
    const variantId = c.req.param('variantId');
    const body = await c.req.json();

    // Validate request body
    const result = updateVariantSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.issues }, 400);
    }

    // Check if variant exists and is from the same tenant
    const existingVariant = await db.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existingVariant) {
      return c.json({ error: 'Variant not found' }, 404);
    }

    // If changing SKU, check if new SKU already exists
    if (result.data.sku && result.data.sku !== existingVariant.sku) {
      const skuExists = await db.productVariant.findFirst({
        where: {
          sku: result.data.sku,
          id: { not: variantId },
        },
      });

      if (skuExists) {
        return c.json({ error: 'SKU already exists' }, 400);
      }
    }

    // Update variant
    const updatedVariant = await db.productVariant.update({
      where: { id: variantId },
      data: result.data,
    });

    return c.json({
      message: 'Variant updated successfully',
      data: updatedVariant,
    });
  } catch (error) {
    console.error('Error updating variant:', error);
    return c.json({ error: 'Failed to update variant' }, 500);
  }
});

// ============================================
// DELETE /api/v1/products/:productId/variants/:variantId - Delete variant
// ============================================
products.delete('/:productId/variants/:variantId', authMiddleware, requirePermission('products.delete'), async (c) => {
  try {
    const currentUser = c.get('user');
    const productId = c.req.param('productId');
    const variantId = c.req.param('variantId');

    // Check if variant exists and is from the same tenant
    const existingVariant = await db.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existingVariant) {
      return c.json({ error: 'Variant not found' }, 404);
    }

    // Delete variant
    await db.productVariant.delete({
      where: { id: variantId },
    });

    return c.json({ message: 'Variant deleted successfully' });
  } catch (error) {
    console.error('Error deleting variant:', error);
    return c.json({ error: 'Failed to delete variant' }, 500);
  }
});

// ============================================
// POST /api/v1/products/:id/images - Add image to product
// ============================================
products.post('/:id/images', authMiddleware, requirePermission('products.create'), async (c) => {
  try {
    const currentUser = c.get('user');
    const productId = c.req.param('id');
    const body = await c.req.json();

    // Validate request body
    const result = createImageSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.issues }, 400);
    }

    // Check if product exists and is from the same tenant
    const product = await db.product.findFirst({
      where: {
        id: productId,
        tenantId: currentUser.tenantId,
      },
    });

    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // If variantId is provided, check if it exists
    if (result.data.variantId) {
      const variant = await db.productVariant.findFirst({
        where: {
          id: result.data.variantId,
          productId,
          tenantId: currentUser.tenantId,
        },
      });

      if (!variant) {
        return c.json({ error: 'Variant not found' }, 404);
      }
    }

    const { url, alt, position, variantId } = result.data;

    // Create image
    const newImage = await db.productImage.create({
      data: {
        productId,
        tenantId: currentUser.tenantId,
        url,
        alt,
        position,
        variantId,
      },
    });

    return c.json(
      {
        message: 'Image created successfully',
        data: newImage,
      },
      201
    );
  } catch (error) {
    console.error('Error creating image:', error);
    return c.json({ error: 'Failed to create image' }, 500);
  }
});

// ============================================
// DELETE /api/v1/products/:productId/images/:imageId - Delete image
// ============================================
products.delete('/:productId/images/:imageId', authMiddleware, requirePermission('products.delete'), async (c) => {
  try {
    const currentUser = c.get('user');
    const productId = c.req.param('productId');
    const imageId = c.req.param('imageId');

    // Check if image exists and is from the same tenant
    const existingImage = await db.productImage.findFirst({
      where: {
        id: imageId,
        productId,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existingImage) {
      return c.json({ error: 'Image not found' }, 404);
    }

    // Delete image
    await db.productImage.delete({
      where: { id: imageId },
    });

    return c.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return c.json({ error: 'Failed to delete image' }, 500);
  }
});

export default products;
