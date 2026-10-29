import prismaMock from '../prisma-mock';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { createUser, getCurrentUser, login, updateUser } from '../../app/routes/auth/auth.service';
import generateToken from '../../app/routes/auth/token.utils';
import getJwtSecret from '../../app/routes/auth/jwt-secret';

const TEST_JWT_SECRET = 'test-jwt-secret-for-auth-service-tests';
const originalJwtSecret = process.env.JWT_SECRET;

const userMock = prismaMock.user as unknown as {
  create: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
};

describe('AuthService', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  describe('JWT secret', () => {
    test('getJwtSecret returns the value from the environment', () => {
      expect(getJwtSecret()).toBe(TEST_JWT_SECRET);
    });

    test('getJwtSecret throws and names the variable when it is unset', () => {
      // Given
      delete process.env.JWT_SECRET;

      // When
      let thrown: Error | undefined;
      try {
        getJwtSecret();
      } catch (error) {
        thrown = error as Error;
      }

      // Then
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown?.message).toContain('JWT_SECRET');
      expect(thrown?.message).not.toContain(TEST_JWT_SECRET);
    });

    test('getJwtSecret throws and names the variable when it is empty', () => {
      // Given
      process.env.JWT_SECRET = '';

      // Then
      expect(() => getJwtSecret()).toThrow('JWT_SECRET');
    });

    test('generateToken signs a token that verifies with the configured secret', () => {
      // When
      const token = generateToken(123);

      // Then
      const decoded = jwt.verify(token, TEST_JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.user).toEqual({ id: 123 });
    });

    test('generateToken throws and names the variable when it is unset', () => {
      // Given
      delete process.env.JWT_SECRET;

      // Then
      expect(() => generateToken(123)).toThrow('JWT_SECRET');
    });

    test('a token signed with another secret does not verify', () => {
      // Given
      const token = jwt.sign({ user: { id: 123 } }, 'another-secret', {
        expiresIn: '60d',
      });

      // Then
      expect(() => jwt.verify(token, TEST_JWT_SECRET)).toThrow();
    });
  });

  describe('createUser', () => {
    test('should create new user ', async () => {
      // Given
      const user = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
      };

      const mockedResponse = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
        bio: null,
        image: null,
        demo: false,
      };

      // When
      const userCreateMock = userMock.create;
      userCreateMock.mockResolvedValue(mockedResponse);

      // Then
      await expect(createUser(user)).resolves.toHaveProperty('token');
    });

    test('should throw an error when creating new user with empty username ', async () => {
      // Given
      const user = {
        id: 123,
        username: ' ',
        email: 'realworld@me',
        password: '1234',
      };

      // Then
      const error = String({ errors: { username: ["can't be blank"] } });
      await expect(createUser(user)).rejects.toThrow(error);
    });

    test('should throw an error when creating new user with empty email ', async () => {
      // Given
      const user = {
        id: 123,
        username: 'RealWorld',
        email: '  ',
        password: '1234',
      };

      // Then
      const error = String({ errors: { email: ["can't be blank"] } });
      await expect(createUser(user)).rejects.toThrow(error);
    });

    test('should throw an error when creating new user with empty password ', async () => {
      // Given
      const user = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: ' ',
      };

      // Then
      const error = String({ errors: { password: ["can't be blank"] } });
      await expect(createUser(user)).rejects.toThrow(error);
    });

    test('should throw an exception when creating a new user with already existing user on same username ', async () => {
      // Given
      const user = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
      };

      const mockedExistingUser = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
        bio: null,
        image: null,
        token: '',
        demo: false,
      };

      // When
      userMock.findUnique.mockResolvedValue(mockedExistingUser);

      // Then
      const error = { email: ['has already been taken'] }.toString();
      await expect(createUser(user)).rejects.toThrow(error);
    });
  });

  describe('login', () => {
    test('should return a token', async () => {
      // Given
      const user = {
        email: 'realworld@me',
        password: '1234',
      };

      const hashedPassword = await bcrypt.hash(user.password, 10);

      const mockedResponse = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: hashedPassword,
        bio: null,
        image: null,
        token: '',
        demo: false,
      };

      // When
      userMock.findUnique.mockResolvedValue(mockedResponse);

      // Then
      await expect(login(user)).resolves.toHaveProperty('token');
    });

    test('should throw an error when the email is empty', async () => {
      // Given
      const user = {
        email: ' ',
        password: '1234',
      };

      // Then
      const error = String({ errors: { email: ["can't be blank"] } });
      await expect(login(user)).rejects.toThrow(error);
    });

    test('should throw an error when the password is empty', async () => {
      // Given
      const user = {
        email: 'realworld@me',
        password: ' ',
      };

      // Then
      const error = String({ errors: { password: ["can't be blank"] } });
      await expect(login(user)).rejects.toThrow(error);
    });

    test('should throw an error when no user is found', async () => {
      // Given
      const user = {
        email: 'realworld@me',
        password: '1234',
      };

      // When
      userMock.findUnique.mockResolvedValue(null);

      // Then
      const error = String({ errors: { 'email or password': ['is invalid'] } });
      await expect(login(user)).rejects.toThrow(error);
    });

    test('should throw an error if the password is wrong', async () => {
      // Given
      const user = {
        email: 'realworld@me',
        password: '1234',
      };

      const hashedPassword = await bcrypt.hash('4321', 10);

      const mockedResponse = {
        id: 123,
        username: 'Gerome',
        email: 'realworld@me',
        password: hashedPassword,
        bio: null,
        image: null,
        token: '',
        demo: false,
      };

      // When
      userMock.findUnique.mockResolvedValue(mockedResponse);

      // Then
      const error = String({ errors: { 'email or password': ['is invalid'] } });
      await expect(login(user)).rejects.toThrow(error);
    });
  });

  describe('getCurrentUser', () => {
    test('should return a token', async () => {
      // Given
      const id = 123;

      const mockedResponse = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
        bio: null,
        image: null,
        token: '',
        demo: false,
      };

      // When
      userMock.findUnique.mockResolvedValue(mockedResponse);

      // Then
      await expect(getCurrentUser(id)).resolves.toHaveProperty('token');
    });
  });

  describe('updateUser', () => {
    test('should return a token', async () => {
      // Given
      const user = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
      };

      const mockedResponse = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
        bio: null,
        image: null,
        token: '',
        demo: false,
      };

      // When
      userMock.update.mockResolvedValue(mockedResponse);

      // Then
      await expect(updateUser(user, user.id)).resolves.toHaveProperty('token');
    });
  });
});
