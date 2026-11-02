import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './core/prisma';

let server: ReturnType<typeof app.listen> | undefined;

if (!process.env.VERCEL) {
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'SIM ORMAWA API siap menerima permintaan');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Menghentikan server');
    server?.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

export { app, server };
export default app;
