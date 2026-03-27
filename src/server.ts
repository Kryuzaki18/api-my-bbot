import { buildApp } from './app.js';

const start = async () => {
  const app = buildApp();
  try {
    // Await ready so plugins (like fastify-env) are strictly resolved before binding the port
    await app.ready();
    const port = app.config.PORT || 3000;
    
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
