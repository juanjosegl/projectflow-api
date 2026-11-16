import { validateEnv } from './env.validation';

const valid = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  FRONTEND_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/v1/auth/google/callback',
};

describe('validateEnv', () => {
  it('accepts a complete configuration', () => {
    expect(validateEnv(valid)).toBe(valid);
  });

  it('lists every missing variable in one error', () => {
    const { DATABASE_URL, JWT_SECRET, ...rest } = valid;
    expect(() => validateEnv(rest)).toThrow(
      'Missing required environment variables: DATABASE_URL, JWT_SECRET',
    );
  });

  it('rejects reusing the access secret for refresh tokens', () => {
    expect(() =>
      validateEnv({ ...valid, JWT_REFRESH_SECRET: valid.JWT_SECRET }),
    ).toThrow('must be different');
  });
});
