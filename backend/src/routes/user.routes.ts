import { Router } from 'express';
import auth from '../middleware/auth.middleware';
import express from 'express';
import { getProfile, updateProfile } from '../controllers/user.controller';
import upload from '../middleware/upload.middleware'; //  Import upload middleware

const router = Router();

router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true, limit: '50mb' }));

router.get('/profile', auth, getProfile);
// Add upload.single middleware for profile photo
router.put('/profile', auth, upload.single('profilePhoto'), updateProfile);

export default router;