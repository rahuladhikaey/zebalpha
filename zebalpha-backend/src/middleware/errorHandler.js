import { HTTP_STATUS } from '../constants/index.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err);
  const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
