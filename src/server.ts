import { buildApp } from './app.js';

const start = async () => {
  const app = buildApp();
  try {
    await app.ready();
    const port = app.config.PORT || 3000;
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
