import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

console.log('⚡ EduSphere Asynchronous Background Worker Daemon initialized.');
console.log(
  '⚡ Worker stands ready to process queues: [notifications, reports, billing, reconciliation].'
);

// Keep worker alive
const heartbeat = setInterval(() => {
  // Idle heartbeat
}, 60000);

process.on('SIGTERM', () => {
  clearInterval(heartbeat);
  console.log('Worker received SIGTERM. Exiting gracefully.');
  process.exit(0);
});

process.on('SIGINT', () => {
  clearInterval(heartbeat);
  console.log('Worker received SIGINT. Exiting gracefully.');
  process.exit(0);
});
