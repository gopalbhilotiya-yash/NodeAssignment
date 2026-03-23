import { Request, Response, NextFunction } from 'express';
import { ILike, Between, FindManyOptions } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { CreateProductDTO, UpdateProductDTO, PaginationDTO, SearchDTO } from '../validators/productValidator';
import { NotFoundError } from '../errors/AppError';
import logger from '../config/logger';

const repo = AppDataSource.getRepository(Product);

// ─── Shared pagination helper ─────────────────────────────────────────────────
const paginate = (total: number, data: Product[], page: number, limit: number) => ({
  data,
  meta: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  },
});

export class ProductController {

  // POST /api/products
  async create(req: Request<{}, {}, CreateProductDTO>, res: Response, next: NextFunction) {
    try {
      const product = repo.create(req.body);
      await repo.save(product);
      logger.info(`Product created: ${product.name}`);
      return res.status(201).json({ success: true, message: 'Product created successfully', data: product });
    } catch (err) { next(err); }
  }

  // GET /api/products?page=1&limit=10&sortBy=createdAt&order=DESC
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, sortBy, order } = req.query as unknown as PaginationDTO;

      const [products, total] = await repo.findAndCount({
        where:  { isActive: true },
        order:  { [sortBy]: order },
        skip:   (page - 1) * limit,
        take:   limit,
      });

      return res.status(200).json({ success: true, ...paginate(total, products, page, limit) });
    } catch (err) { next(err); }
  }

  // GET /api/products/:id
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await repo.findOne({ where: { id: req.params.id, isActive: true } });
      if (!product) return next(new NotFoundError('Product not found'));
      return res.status(200).json({ success: true, data: product });
    } catch (err) { next(err); }
  }

  // PATCH /api/products/:id
  async update(req: Request<{ id: string }, {}, UpdateProductDTO>, res: Response, next: NextFunction) {
    try {
      const product = await repo.findOne({ where: { id: req.params.id } });
      if (!product) return next(new NotFoundError('Product not found'));

      repo.merge(product, req.body);
      await repo.save(product);
      logger.info(`Product updated: ${product.id}`);
      return res.status(200).json({ success: true, message: 'Product updated successfully', data: product });
    } catch (err) { next(err); }
  }

  // DELETE /api/products/:id
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await repo.findOne({ where: { id: req.params.id } });
      if (!product) return next(new NotFoundError('Product not found'));

      product.isActive = false;          // soft delete
      await repo.save(product);
      logger.info(`Product deleted: ${product.id}`);
      return res.status(200).json({ success: true, message: 'Product deleted successfully' });
    } catch (err) { next(err); }
  }

  // GET /api/products/search?q=shirt&category=clothing&minPrice=10&maxPrice=100&page=1&limit=10
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, category, minPrice, maxPrice, page, limit, sortBy, order } = req.query as unknown as SearchDTO;

      const where: FindManyOptions<Product>['where'] = [];

      // search by name OR description
      const baseFilter = { isActive: true, ...(category && { category }) };
      const priceFilter = minPrice && maxPrice ? { price: Between(minPrice, maxPrice) } : {};

      where.push({ ...baseFilter, ...priceFilter, name: ILike(`%${q}%`) });
      where.push({ ...baseFilter, ...priceFilter, description: ILike(`%${q}%`) });

      const [products, total] = await repo.findAndCount({
        where,
        order: { [sortBy]: order },
        skip:  (page - 1) * limit,
        take:  limit,
      });

      return res.status(200).json({ success: true, ...paginate(total, products, page, limit) });
    } catch (err) { next(err); }
  }
}
