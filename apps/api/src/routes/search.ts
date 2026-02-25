// Search Endpoints
import { Hono } from 'hono';
import { db } from '../lib/db';
import { optionalAuthMiddleware } from '../middleware/auth';

const search = new Hono();

// ============================================
// GET /api/v1/search - Full-text search across products
// ============================================
search.get('/', optionalAuthMiddleware, async (c) => {
  try {
    const query = c.req.query('q') || '';
    const categoryId = c.req.query('category_id');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const minPrice = c.req.query('min_price');
    const maxPrice = c.req.query('max_price');
    const inStock = c.req.query('in_stock');

    const tenantId = c.get('tenantId');

    if (!query) {
      return c.json({ error: 'Query parameter "q" is required' }, 400);
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isActive: true,
    };

    // Add tenant filter if authenticated
    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Price filter
    if (minPrice || maxPrice) {
      where.variants = {
        some: {},
      };
      if (minPrice) {
        where.variants.some.price = { ...where.variants.some.price, gte: parseFloat(minPrice) };
      }
      if (maxPrice) {
        where.variants.some.price = { ...where.variants.some.price, lte: parseFloat(maxPrice) };
      }
    }

    // Stock filter
    if (inStock === 'true') {
      where.variants = {
        some: {
          stock: { gt: 0 },
          isActive: true,
        },
      };
    }

    // Build search conditions
    const searchConditions: any[] = [];
    if (query) {
      searchConditions.push(
        { name: { contains: query, mode: 'insensitive' as const } },
        { description: { contains: query, mode: 'insensitive' as const } }
      );
    }

    if (searchConditions.length > 0) {
      where.OR = searchConditions;
    }

    const [productsList, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              price: true,
              comparePrice: true,
              stock: true,
            },
            orderBy: { price: 'asc' },
          },
          images: {
            select: {
              id: true,
              url: true,
              alt: true,
              position: true,
            },
            orderBy: { position: 'asc' },
            take: 1,
          },
        },
      }),
      db.product.count({ where }),
    ]);

    return c.json({
      data: productsList,
      meta: {
        query,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return c.json({ error: 'Failed to search products' }, 500);
  }
});

// ============================================
// GET /api/v1/search/suggestions - Get search suggestions
// ============================================
search.get('/suggestions', optionalAuthMiddleware, async (c) => {
  try {
    const query = c.req.query('q') || '';
    const tenantId = c.get('tenantId');
    const limit = parseInt(c.req.query('limit') || '5');

    if (!query || query.length < 2) {
      return c.json({ data: [] });
    }

    const where: any = {
      isActive: true,
    };

    // Add tenant filter if authenticated
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const products = await db.product.findMany({
      where: {
        ...where,
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { description: { contains: query, mode: 'insensitive' as const } },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    const suggestions = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category?.name,
    }));

    return c.json({ data: suggestions });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return c.json({ error: 'Failed to fetch suggestions' }, 500);
  }
});

export default search;
