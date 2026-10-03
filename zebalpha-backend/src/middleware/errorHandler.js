import { HTTP_STATUS } from '../constants/index.js';

export const errorHandler = (err, req, res, next) => {
  const requestId = req?.id || req?.correlationId || 'N/A';
  console.error(`[Error] [Request ID: ${requestId}]`, err);
  const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
    requestId: requestId !== 'N/A' ? requestId : undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

