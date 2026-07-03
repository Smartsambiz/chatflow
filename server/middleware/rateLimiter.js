const buckets = new Map();

const rateLimiter = ({ windowMs = 60 * 1000, max = 60, keyGenerator } = {}) => (req, res, next) => {
  const now = Date.now();
  const key = keyGenerator ? keyGenerator(req) : req.ip;
  const bucketKey = `${key}:${req.baseUrl || req.path}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return next();
  }

  bucket.count += 1;

  if (bucket.count > max) {
    res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
  }

  return next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60 * 1000).unref();

module.exports = rateLimiter;
