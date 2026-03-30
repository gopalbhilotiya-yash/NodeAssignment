import { Request, Response, NextFunction } from 'express';
import { ILike, Between, FindManyOptions } from 'typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { CreateProductDTO, UpdateProductDTO, PaginationDTO, SearchDTO, ExportDTO } from '../validators/productValidator';
import { NotFoundError, BadRequestError } from '../errors/AppError';
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

  // POST /api/products/export
  async export(req: Request<{}, {}, ExportDTO>, res: Response, next: NextFunction) {
    try {
      const { format, category, minPrice, maxPrice } = req.body;

      // ─── Build filter ──────────────────────────────────────────────────────
      const where: FindManyOptions<Product>['where'] = {
        isActive: true,
        ...(category && { category }),
        ...(minPrice && maxPrice && { price: Between(minPrice, maxPrice) }),
      };

      const products = await repo.find({ where, order: { createdAt: 'DESC' } });

      if (products.length === 0) return next(new BadRequestError('No products found for given filters'));

      logger.info(`Exporting ${products.length} products as ${format}`);

      // ─── XLSX ──────────────────────────────────────────────────────────────
      if (format === 'xlsx') {
        const workbook  = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Products');

        // header row with styles
        worksheet.columns = [
          { header: 'ID',          key: 'id',          width: 38 },
          { header: 'Name',        key: 'name',        width: 25 },
          { header: 'Category',    key: 'category',    width: 18 },
          { header: 'Price ($)',   key: 'price',       width: 12 },
          { header: 'Stock',       key: 'stock',       width: 10 },
          { header: 'Description', key: 'description', width: 40 },
          { header: 'Active',      key: 'isActive',    width: 10 },
          { header: 'Created At',  key: 'createdAt',   width: 22 },
        ];

        // style header row
        worksheet.getRow(1).eachCell((cell) => {
          cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // add data rows
        products.forEach((p) => {
          worksheet.addRow({
            id:          p.id,
            name:        p.name,
            category:    p.category,
            price:       Number(p.price),
            stock:       p.stock,
            description: p.description,
            isActive:    p.isActive ? 'Yes' : 'No',
            createdAt:   new Date(p.createdAt).toLocaleString(),
          });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');

        await workbook.xlsx.write(res);
        return res.end();
      }

      // ─── PDF ───────────────────────────────────────────────────────────────
      if (format === 'pdf') {
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=products.pdf');
        doc.pipe(res);

        // ── Title ──
        doc.fontSize(18).font('Helvetica-Bold').text('Products Report', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}  |  Total: ${products.length}`, { align: 'center' });
        doc.moveDown();

        // ── Table header ──
        const cols  = { name: 40, category: 200, price: 310, stock: 390, active: 450, created: 510 };
        const rowH  = 20;
        let   y     = doc.y;

        const drawHeader = () => {
          doc.rect(30, y, 780, rowH).fill('#2563EB');
          doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
          doc.text('Name',        cols.name,     y + 5, { width: 155 });
          doc.text('Category',    cols.category, y + 5, { width: 105 });
          doc.text('Price ($)',   cols.price,    y + 5, { width: 75 });
          doc.text('Stock',       cols.stock,    y + 5, { width: 55 });
          doc.text('Active',      cols.active,   y + 5, { width: 55 });
          doc.text('Created At',  cols.created,  y + 5, { width: 120 });
          y += rowH;
        };

        drawHeader();

        // ── Table rows ──
        products.forEach((p, i) => {
          // new page if needed
          if (y > 530) {
            doc.addPage();
            y = 40;
            drawHeader();
          }

          const bg = i % 2 === 0 ? '#F1F5F9' : '#FFFFFF';
          doc.rect(30, y, 780, rowH).fill(bg);
          doc.fillColor('black').fontSize(8).font('Helvetica');
          doc.text(p.name.substring(0, 22),                    cols.name,     y + 5, { width: 155 });
          doc.text(p.category,                                 cols.category, y + 5, { width: 105 });
          doc.text(`$${Number(p.price).toFixed(2)}`,           cols.price,    y + 5, { width: 75 });
          doc.text(String(p.stock),                            cols.stock,    y + 5, { width: 55 });
          doc.text(p.isActive ? 'Yes' : 'No',                  cols.active,   y + 5, { width: 55 });
          doc.text(new Date(p.createdAt).toLocaleDateString(), cols.created,  y + 5, { width: 120 });
          y += rowH;
        });

        doc.end();
        return;
      }
    } catch (err) { next(err); }
  }
}
