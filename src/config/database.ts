import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { Cart, CartItem } from '../entities/Cart';
import { Order, OrderItem } from '../entities/Order';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'ecommerce.db',
  synchronize: true,
  logging: false,
  entities: [User, Product, Cart, CartItem, Order, OrderItem],
  migrations: [],
  subscribers: [],
});
