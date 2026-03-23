import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Order, OrderItem, OrderStatus } from '../entities/Order';
import { Cart, CartItem } from '../entities/Cart';
import { AuthRequest } from '../types/AuthRequest';
import { CreateOrderDTO, UpdateOrderStatusDTO } from '../validators/cartOrderValidator';
import { NotFoundError, BadRequestError, ForbiddenError } from '../errors/AppError';
import logger from '../config/logger';
import { PaginationDTO } from '../validators/productValidator';

const orderRepo = AppDataSource.getRepository(Order);
const cartRepo  = AppDataSource.getRepository(Cart);
const itemRepo  = AppDataSource.getRepository(CartItem);

export class OrderController {

  // POST /api/orders  — creates order from current cart
  async createOrder(req: AuthRequest & { body: CreateOrderDTO }, res: Response, next: NextFunction) {
    try {
      const cart = await cartRepo.findOne({ where: { userId: req.userId } });
      if (!cart || cart.items.length === 0) return next(new BadRequestError('Cart is empty'));

      // build order items + calculate total
      const orderItems: Partial<OrderItem>[] = cart.items.map((i) => ({
        productId:    i.productId,
        quantity:     i.quantity,
        priceAtOrder: Number(i.product.price),
      }));

      const totalAmount = orderItems.reduce(
        (sum, i) => sum + Number(i.priceAtOrder) * Number(i.quantity), 0
      );

      const order = orderRepo.create({
        userId:          req.userId,
        items:           orderItems as OrderItem[],
        totalAmount:     Number(totalAmount.toFixed(2)),
        shippingAddress: req.body.shippingAddress,
        status:          OrderStatus.PENDING,
      });

      await orderRepo.save(order);

      // clear cart after order placed
      await itemRepo.delete({ cartId: cart.id });

      logger.info(`Order created: ${order.id} user=${req.userId}`);
      return res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
    } catch (err) { next(err); }
  }

  // GET /api/orders?page=1&limit=10&sortBy=createdAt&order=DESC
  async getMyOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, sortBy, order } = req.query as unknown as PaginationDTO;

      const [orders, total] = await orderRepo.findAndCount({
        where: { userId: req.userId },
        order: { [sortBy]: order },
        skip:  (page - 1) * limit,
        take:  limit,
      });

      return res.status(200).json({
        success: true,
        data: orders,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      });
    } catch (err) { next(err); }
  }

  // GET /api/orders/:id
  async getOrderById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await orderRepo.findOne({ where: { id: req.params.id } });
      if (!order) return next(new NotFoundError('Order not found'));
      if (order.userId !== req.userId) return next(new ForbiddenError('Access denied'));

      return res.status(200).json({ success: true, data: order });
    } catch (err) { next(err); }
  }

  // PUT /api/orders/:id/status
  async updateStatus(req: AuthRequest & { body: UpdateOrderStatusDTO }, res: Response, next: NextFunction) {
    try {
      const order = await orderRepo.findOne({ where: { id: req.params.id } });
      if (!order) return next(new NotFoundError('Order not found'));

      if (order.status === OrderStatus.CANCELLED)
        return next(new BadRequestError('Cannot update a cancelled order'));

      order.status = req.body.status;
      await orderRepo.save(order);

      logger.info(`Order status updated: ${order.id} → ${order.status}`);
      return res.status(200).json({ success: true, message: 'Order status updated', data: order });
    } catch (err) { next(err); }
  }

  // PUT /api/orders/:id/cancel
  async cancelOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await orderRepo.findOne({ where: { id: req.params.id } });
      if (!order) return next(new NotFoundError('Order not found'));
      if (order.userId !== req.userId) return next(new ForbiddenError('Access denied'));

      if ([OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status))
        return next(new BadRequestError(`Cannot cancel an order that is already ${order.status}`));

      order.status = OrderStatus.CANCELLED;
      await orderRepo.save(order);

      logger.info(`Order cancelled: ${order.id}`);
      return res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order });
    } catch (err) { next(err); }
  }
}
