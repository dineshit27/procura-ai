import { Router, Request, Response } from 'express';
import { CATALOG_ITEMS } from '../data/catalog.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

export const catalogRouter = Router();

/**
 * GET /api/catalog
 * Returns the authoritative list of pre-approved procurement catalog items.
 */
catalogRouter.get('/', requireAuth, requirePermission('read_requests'), (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: CATALOG_ITEMS,
    count: CATALOG_ITEMS.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/catalog/:id
 * Returns a single authoritative catalog item by ID.
 */
catalogRouter.get('/:id', requireAuth, requirePermission('read_requests'), (req: Request, res: Response) => {
  const id = req.params.id;
  const item = CATALOG_ITEMS.find((c) => c.id.toLowerCase() === id?.toLowerCase());

  if (!item) {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `Catalog item "${id}" was not found.`,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: item,
  });
});
