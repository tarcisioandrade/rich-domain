import 'dotenv/config';
import { buildApp } from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    const fastify = await buildApp();

    await fastify.listen({ port: PORT, host: HOST });

    console.log(`Server is running at http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
