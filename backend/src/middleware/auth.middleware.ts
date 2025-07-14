import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

// Define your custom JWT payload structure
interface CustomJwtPayload extends JwtPayload {
  id: string;
  email: string;
}

const auth = (req: Request, res: Response, next: NextFunction) => {
  // Get token from header
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1]; // Expects "Bearer TOKEN" format

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as CustomJwtPayload;
    req.user = decoded; // Attach user payload to request
    next(); // Proceed to the next middleware/route handler
  } catch (err) {
    res.status(403).json({ message: 'Token is not valid' });
  }
};

export default auth;