import axios from 'axios';

const expectUnauthorizedErrorBody = (data: any) => {
  expect(data).toHaveProperty('errors.body');
  expect(Array.isArray(data.errors.body)).toBe(true);
  expect(data.errors.body.length).toBeGreaterThan(0);
  expect(data).not.toHaveProperty('status');
  expect(data).not.toHaveProperty('message');
};

const requestWithoutToken = (config: Parameters<typeof axios.request>[0]) =>
  axios.request({ ...config, validateStatus: () => true });

const requestWithInvalidToken = (config: Parameters<typeof axios.request>[0]) =>
  axios.request({
    ...config,
    validateStatus: () => true,
    headers: { Authorization: 'Token not-a-valid-jwt' },
  });

describe('GET /', () => {
  it('should return a message', async () => {
    const res = await axios.get(`/`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ status: 'API is running on /api' });
  });
});

describe('missing or invalid credentials', () => {
  const endpoints = [
    { method: 'get', url: '/api/articles/bookmarks' },
    { method: 'post', url: '/api/articles/some-article/bookmark' },
  ];

  it.each(endpoints)('answers 401 in the errors.body format without a token ($method $url)', async (endpoint) => {
    const res = await requestWithoutToken(endpoint);

    expect(res.status).toBe(401);
    expectUnauthorizedErrorBody(res.data);
  });

  it.each(endpoints)('answers 401 in the errors.body format with an invalid token ($method $url)', async (endpoint) => {
    const res = await requestWithInvalidToken(endpoint);

    expect(res.status).toBe(401);
    expectUnauthorizedErrorBody(res.data);
  });
});
