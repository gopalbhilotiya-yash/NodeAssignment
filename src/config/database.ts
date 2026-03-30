import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { Cart, CartItem } from '../entities/Cart';
import { Order, OrderItem } from '../entities/Order';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'ecommerce.db',
  synchronize: true,            // set to false in production — use migrations instead
  logging: false,
  entities: [User, Product, Cart, CartItem, Order, OrderItem],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
});
