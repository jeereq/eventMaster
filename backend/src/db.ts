import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { getPostgresSslConfig } from './config/security';

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: getPostgresSslConfig(),
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
