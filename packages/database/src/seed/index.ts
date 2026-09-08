import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runSeed } from './seedRunner.js';

export * from './seedRunner.js';
export * from './permissions.data.js';
export * from './roles.data.js';

// Load environment variables if running as standalone CLI script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../apps/api/.env') });
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/edusphere_erp';

async function main() {
  try {
    console.log(`[Seed CLI] Connecting to MongoDB: ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('[Seed CLI] MongoDB Connected.');

    const result = await runSeed();
    console.log('[Seed CLI] Summary:', JSON.stringify(result, null, 2));

    await mongoose.disconnect();
    console.log('[Seed CLI] Disconnected. Seed completed cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed CLI] Error during database seeding:', error);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

// If executed directly
if (process.argv[1] && process.argv[1].endsWith('seed/index.ts')) {
  main();
}
