import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/postgres.schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://hendy_admin:password@localhost:5432/hendy_store',
  },
});
