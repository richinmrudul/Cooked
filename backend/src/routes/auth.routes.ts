import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import express from 'express'; 

const router = Router();

router.use(express.json({ limit: '50mb' })); //  with limit

router.post('/register', register);
router.post('/login', login);

export default router;