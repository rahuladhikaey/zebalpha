import app from './src/app.js';
import dotenv from 'dotenv';
import { initCronJobs } from './src/jobs/index.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 ASALISWAD Backend API running on port ${PORT}`);
  initCronJobs();
});

