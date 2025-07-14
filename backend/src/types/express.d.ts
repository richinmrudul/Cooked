import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express'; // Import Request to extend it directly

// Define your custom JWT payload structure
interface CustomJwtPayload extends JwtPayload {
  id: string;
  email: string;
}

// Augment the existing Request interface directly
declare module 'express-serve-static-core' {
  interface Request {
    user?: CustomJwtPayload; // Use your custom payload type
  }
}