import { createServer } from './server.js';
import { env, getPayPalConfig } from './config/env.js';

const app = createServer();

const server = app.listen(env.PORT, () => {
  const paypal = getPayPalConfig();

  console.log(`===============================================`);
  console.log(`🚀 Procura AI API Server started successfully`);
  console.log(`📡 URL: http://localhost:${env.PORT}`);
  console.log(`🩺 Health check: http://localhost:${env.PORT}/api/health`);
  console.log(`⚙️  Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Allowed Client: ${env.CLIENT_URL}`);
  if (paypal.checkoutEnabled) {
    console.log(`💳 PayPal Checkout: ENABLED (${paypal.baseUrl})`);
  } else {
    console.log(`💳 PayPal Checkout: DISABLED (${paypal.message})`);
  }
  console.log(`===============================================`);
});

// Graceful shutdown handling
function handleShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server close:', err);
      process.exit(1);
    }
    console.log('✅ Server stopped accepting new connections.');
    process.exit(0);
  });

  // Force shutdown after timeout if pending connections hang
  setTimeout(() => {
    console.error('⚠️ Forcefully terminating after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  handleShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  handleShutdown('unhandledRejection');
});
