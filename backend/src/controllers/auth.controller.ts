import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';

const register = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body; // Added firstName, lastName
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'First name, last name, email, and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Updated INSERT statement to include first_name and last_name
    const result = await pool.query(
      'INSERT INTO users (first_name, last_name, name, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id, first_name, last_name, name, email, created_at',
      [firstName, lastName, `${firstName} ${lastName}`, email, hashedPassword] // 'name' combines first and last for compatibility
    );
    const user = result.rows[0];
    res.status(201).json({ message: 'User registered successfully', user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email } });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && typeof (error as any).code === 'string') {
      if ((error as any).code === '23505') {
        return res.status(409).json({ message: 'Email already registered' });
      }
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Updated SELECT statement to retrieve first_name and last_name
    const result = await pool.query('SELECT id, first_name, last_name, name, email, password_hash FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email }, // JWT payload doesn't change
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    // Updated response to include first_name and last_name
    res.status(200).json({ token, user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email } });
  } catch (error: unknown) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export { register, login };