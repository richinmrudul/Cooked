import { Router } from 'express';
import auth from '../middleware/auth.middleware';
import express from 'express';
import { getProfile, updateProfile } from '../controllers/user.controller';
import upload from '../middleware/upload.middleware'; // NEW: Import upload middleware

const router = Router();

// User profile routes will handle JSON for non-file updates or multipart for file updates
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true, limit: '50mb' }));

router.get('/profile', auth, getProfile);

router.put('/profile', auth, upload.single('profilePhoto'), updateProfile); // 'profilePhoto' must match frontend field name

export default router;