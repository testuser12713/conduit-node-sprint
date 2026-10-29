import * as jwt from 'jsonwebtoken';
import getJwtSecret from './jwt-secret';

const generateToken = (id: number): string =>
  jwt.sign({ user: { id } }, getJwtSecret(), {
    expiresIn: '60d',
  });

export default generateToken;
