const parseList = (value) => (
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const makePattern = (origin) => new RegExp(`^${origin.split('*').map(escapeRegExp).join('.*')}$`);

const isOriginAllowed = (origin, allowedOrigins) => {
  if (!origin) return true;

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === origin) return true;
    if (allowedOrigin.includes('*')) {
      return makePattern(allowedOrigin).test(origin);
    }
    return false;
  });
};

const getAllowedOrigins = () => {
  const configuredOrigins = [
    ...parseList(process.env.CLIENT_ORIGIN),
    ...parseList(process.env.CORS_ORIGINS),
  ];

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return [
    'https://*.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
};

const validateRequiredEnv = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'WHATSAPP_VERIFY_TOKEN'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length === 0) return;

  const message = `Missing required environment variables: ${missing.join(', ')}`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  }

  console.warn(message);
};

module.exports = {
  getAllowedOrigins,
  isOriginAllowed,
  validateRequiredEnv,
};
