import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Product } from './entities/Product';
import { Cart, CartItem } from './entities/Cart';
import { Order, OrderItem } from './entities/Order';

// This DataSource is used ONLY by TypeORM CLI for migrations
// synchronize is OFF — migrations handle schema changes manually
const MigrationDataSource = new DataSource({
  type: 'sqlite',
  database: 'ecommerce.db',
  synchronize: false,           // ← OFF in production/migration mode
  logging: true,
  entities: [User, Product, Cart, CartItem, Order, OrderItem],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
});

export default MigrationDataSource;
