const notFound = (req, res) => {
  res.status(404).json({ message: 'Route not found' });
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error('Unhandled request error:', error.message);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    message: statusCode >= 500 ? 'Server error' : error.message,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
