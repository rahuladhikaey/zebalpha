import app from './src/app.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initCronJobs } from './src/jobs/index.js';
import { testDatabaseConnection } from './src/database/index.js';
import { ensureStorageBuckets } from './src/utils/storageInit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.resolve(__dirname, 'back.env'),
  path.resolve(process.cwd(), 'back.env'),
  path.resolve(process.cwd(), 'zebalpha-backend/back.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'zebalpha-backend/.env')
];

let envLoaded = false;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  dotenv.config();
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 ZEBALPHA Backend API running on port ${PORT}`);
  await testDatabaseConnection();
  await ensureStorageBuckets();
  initCronJobs();
});


