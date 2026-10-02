import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';

const server = Fastify({ logger: true });

server.register(cors, { origin: true });
server.register(jwt, { secret: process.env.JWT_SECRET || 'super-secret-key' });

server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 5000;
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Fastify API Core running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
