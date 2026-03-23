import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Cart, CartItem } from '../entities/Cart';
import { Product } from '../entities/Product';
import { AuthRequest } from '../types/AuthRequest';
import { AddToCartDTO, UpdateCartItemDTO } from '../validators/cartOrderValidator';
import { NotFoundError, BadRequestError } from '../errors/AppError';
import logger from '../config/logger';

const cartRepo    = AppDataSource.getRepository(Cart);
const itemRepo    = AppDataSource.getRepository(CartItem);
const productRepo = AppDataSource.getRepository(Product);

// ─── helper: get or create cart for user ─────────────────────────────────────
const getOrCreateCart = async (userId: string): Promise<Cart> => {
  let cart = await cartRepo.findOne({ where: { userId } });
  if (!cart) {
    cart = cartRepo.create({ userId });
    await cartRepo.save(cart);
  }
  return cart;
};

export class CartController {

  // POST /api/cart/items
  async addItem(req: AuthRequest & { body: AddToCartDTO }, res: Response, next: NextFunction) {
    try {
      const { productId, quantity } = req.body;

      const product = await productRepo.findOne({ where: { id: productId, isActive: true } });
      if (!product) return next(new NotFoundError('Product not found'));
      if (product.stock < quantity) return next(new BadRequestError(`Only ${product.stock} items in stock`));

      const cart = await getOrCreateCart(req.userId!);

      // if item already exists — increment quantity
      let item = await itemRepo.findOne({ where: { cartId: cart.id, productId } });
      if (item) {
        const newQty = item.quantity + quantity;
        if (product.stock < newQty) return next(new BadRequestError(`Only ${product.stock} items in stock`));
        item.quantity = newQty;
      } else {
        item = itemRepo.create({ cartId: cart.id, productId, quantity });
      }

      await itemRepo.save(item);
      const updatedCart = await cartRepo.findOne({ where: { id: cart.id } });
      logger.info(`Cart item added: user=${req.userId} product=${productId}`);

      return res.status(200).json({ success: true, message: 'Item added to cart', data: updatedCart });
    } catch (err) { next(err); }
  }

  // GET /api/cart
  async getCart(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cart = await cartRepo.findOne({ where: { userId: req.userId } });
      if (!cart) return res.status(200).json({ success: true, data: { items: [], total: 0 } });

      const total = cart.items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

      return res.status(200).json({ success: true, data: { ...cart, total: Number(total.toFixed(2)) } });
    } catch (err) { next(err); }
  }

  // PUT /api/cart/items/:itemId
  async updateItem(req: AuthRequest & { body: UpdateCartItemDTO }, res: Response, next: NextFunction) {
    try {
      const item = await itemRepo.findOne({ where: { id: req.params.itemId } });
      if (!item) return next(new NotFoundError('Cart item not found'));

      const product = await productRepo.findOne({ where: { id: item.productId } });
      if (product && product.stock < req.body.quantity)
        return next(new BadRequestError(`Only ${product.stock} items in stock`));

      item.quantity = req.body.quantity;
      await itemRepo.save(item);

      const cart = await cartRepo.findOne({ where: { id: item.cartId } });
      return res.status(200).json({ success: true, message: 'Cart item updated', data: cart });
    } catch (err) { next(err); }
  }

  // DELETE /api/cart/items/:itemId
  async removeItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await itemRepo.findOne({ where: { id: req.params.itemId } });
      if (!item) return next(new NotFoundError('Cart item not found'));

      await itemRepo.remove(item);
      logger.info(`Cart item removed: ${req.params.itemId}`);
      return res.status(200).json({ success: true, message: 'Item removed from cart' });
    } catch (err) { next(err); }
  }

  // DELETE /api/cart
  async clearCart(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cart = await cartRepo.findOne({ where: { userId: req.userId } });
      if (!cart) return next(new NotFoundError('Cart not found'));

      await itemRepo.delete({ cartId: cart.id });
      logger.info(`Cart cleared: user=${req.userId}`);
      return res.status(200).json({ success: true, message: 'Cart cleared' });
    } catch (err) { next(err); }
  }
}
