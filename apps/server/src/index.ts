import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { timerManager } from './engine/TimerManager.js';

async function main() {
  await connectDatabase();
  const { httpServer } = createApp();

  httpServer.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🎴 Mindi Coat server running on port ${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Client URL: ${env.CLIENT_URL}`);
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    timerManager.clearAll();
    await disconnectDatabase();
    httpServer.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
