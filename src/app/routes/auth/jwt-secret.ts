const JWT_SECRET_VARIABLE = 'JWT_SECRET';

const getJwtSecret = (): string => {
  const secret = process.env[JWT_SECRET_VARIABLE];

  if (typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error(
      `${JWT_SECRET_VARIABLE} environment variable is required but was not set`
    );
  }

  return secret;
};

export default getJwtSecret;
