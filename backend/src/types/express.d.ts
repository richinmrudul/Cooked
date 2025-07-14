import { JwtPayload } from 'jsonwebtoken';

declare global { // Added 'declare global' for more explicit global augmentation
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}