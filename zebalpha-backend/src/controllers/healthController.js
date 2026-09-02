import { HTTP_STATUS } from '../constants/index.js';

export const checkHealth = (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    status: 'online',
    service: 'ASALISWAD Backend API',
    timestamp: new Date().toISOString()
  });
};
