export function healthCheck() {
  return {
    guild: 'writers',
    status: 'healthy',
    version: '0.1.0',
    nats_prefix: 'citadel.writer.*',
    timestamp: new Date().toISOString(),
  };
}
