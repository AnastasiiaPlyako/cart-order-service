import {Injectable} from '@nestjs/common';

import { v4 } from 'uuid';

import { Cart } from '../models';

import { Client } from 'pg';

const connectDb = {
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
    ssl: true
  }
}


@Injectable()
export class CartService {
  async findByUserId(userId: string): Promise<Cart> {
    const client = new Client(connectDb);
    try {
      await client.connect();
      const query = `select * from carts where user_id='${userId}'`;
      const { rows: carts } = await client.query(query);
      if (carts) {
        const query = `select * from cart_items where cart_id='${carts[0].id}'`;
        const { rows: cart_items } = await client.query(query);
        return { id: carts[0].id, items: cart_items };
      }
    } catch(e) {
      console.log('e', e)
    } finally {
      await client.end();
    }
  }

  async createByUserId(userId: string) {
    const client = new Client(connectDb);
    await client.connect();
    try {
      const id = v4(v4());
      const currentDate = new Date();
      const query = `insert into carts (id, user_id, created_at, updated_at, status)
        VALUES ($1, $2, $3, $4, $5)`;
      return await client.query(query, [
        id,
        userId,
        currentDate,
        currentDate,
        'ORDERED',
      ]);
    } catch (e) {
      console.log('e', e)
    } finally {
      await client.end();
    }
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return await this.createByUserId(userId);
  }

  async updateByUserId(userId: string, { items }: Cart): Promise<Cart> {
    const client = new Client(connectDb);
    await client.connect();
    try {
      const { id, items: findItems } = await this.findOrCreateByUserId(userId);

      for (const item of items) {
        const {
          product: { id: product_id },
          count,
        } = item;
        const query =
            'INSERT INTO cart_items (product_id, cart_id, count) VALUES ($1, $2, $3)';
        await client.query(query, [product_id, id, count]);
      }
      return { id, items: [...items, ...findItems] };
    } catch (e) {
      console.log('e', e)
    } finally {
      await client.end();
    }
  }

  async removeByUserId(userId): Promise<void> {
    try {
      const client = new Client(connectDb);
      await client.connect();
      const query = `delete from carts where user_id='${userId}';`;
      return await client.query(query)?.rows;
    } catch (e) {
      console.log('e', e)
    }
  }

}
