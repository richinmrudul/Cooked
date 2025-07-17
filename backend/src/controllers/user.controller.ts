import { Request, Response } from 'express';
import pool from '../db';
import { QueryResult } from 'pg';
import bcrypt from 'bcryptjs';

async function getUserStats(userId: string) {
    const totalMealsResult = await pool.query('SELECT COUNT(*) AS total FROM meals WHERE user_id = $1', [userId]);
    const avgRatingResult = await pool.query('SELECT AVG(overall_rating)::numeric(10,2) AS avg_rating FROM meals WHERE user_id = $1', [userId]);
    const rankedMealsResult = await pool.query(
        `SELECT
            r.score::numeric(10,2) AS score, m.id, m.title, m.description, m.photo_url, m.overall_rating, m.date_made
        FROM rankings r
        JOIN meals m ON r.meal_id = m.id
        WHERE r.user_id = $1
        ORDER BY r.score DESC
        LIMIT 5`,
        [userId]
    );
    const userStreakResult = await pool.query(
        'SELECT current_streak, longest_streak FROM users WHERE id = $1',
        [userId]
    );
    const userStreakData = userStreakResult.rows[0] || { current_streak: 0, longest_streak: 0 };


    return {
        totalMeals: parseInt(totalMealsResult.rows[0]?.total || '0'),
        averageRating: parseFloat(avgRatingResult.rows[0]?.avg_rating || '0'),
        topRankedMeals: rankedMealsResult.rows.map((row, index) => ({
            ...row,
            score: parseFloat(row.score),
            rank_position: index + 1
        })),
        currentStreak: userStreakData.current_streak,
        longestStreak: userStreakData.longest_streak,
    };
}

const getProfile = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }

    try {
        const userResult: QueryResult = await pool.query(
            'SELECT id, first_name, last_name, email, created_at, profile_photo_url, current_streak, longest_streak, last_meal_date FROM users WHERE id = $1',
            [userId]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const stats = await getUserStats(userId);

        // NEW: Log streak values here
        console.log(`User ${user.email} (ID: ${userId}) Profile Fetch:`);
        console.log(`  current_streak from DB: ${user.current_streak}`);
        console.log(`  longest_streak from DB: ${user.longest_streak}`);
        console.log(`  last_meal_date from DB: ${user.last_meal_date}`);
        console.log(`  currentStreak from stats: ${stats.currentStreak}`);
        console.log(`  longestStreak from stats: ${stats.longestStreak}`);


        res.status(200).json({
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            createdAt: user.created_at,
            profilePhotoUrl: user.profile_photo_url,
            stats: {
                ...stats,
                lastMealDate: user.last_meal_date // Pass last_meal_date for potential frontend debugging if needed
            }
        });
    } catch (error: unknown) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
};

const updateProfile = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }

    const { firstName, lastName, email, password, currentPassword, profilePhotoUrl, photo_url_is_null } = req.body;

    try {
        await pool.query('BEGIN');

        const userResult: QueryResult = await pool.query(
            'SELECT password_hash, profile_photo_url FROM users WHERE id = $1',
            [userId]
        );
        const user = userResult.rows[0];

        if (!user) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found.' });
        }

        let newPasswordHash = user.password_hash;
        if (password) {
            if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password_hash))) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ message: 'Current password is required and must be correct to change password.' });
            }
            newPasswordHash = await bcrypt.hash(password, 10);
        }

        let newProfilePhotoUrl: string | null = user.profile_photo_url;
        if (profilePhotoUrl) { // Assuming profilePhotoUrl is sent directly from frontend if it's a URL input
            newProfilePhotoUrl = profilePhotoUrl;
        } else if (photo_url_is_null === 'true') { // Flag sent from frontend to explicitly clear photo
            newProfilePhotoUrl = null;
        } else if (req.file) { // If profilePhoto is sent as a file
            newProfilePhotoUrl = `http://localhost:${process.env.PORT || 5000}/uploads/${req.file.filename}`;
        }

        const updateResult: QueryResult = await pool.query(
            `UPDATE users
             SET first_name = $1, last_name = $2, email = $3, password_hash = $4, profile_photo_url = $5
             WHERE id = $6
             RETURNING id, first_name, last_name, email, created_at, profile_photo_url`,
            [firstName, lastName, email, newPasswordHash, newProfilePhotoUrl, userId]
        );

        await pool.query('COMMIT');
        res.status(200).json({ message: 'Profile updated successfully!', user: updateResult.rows[0] });

    } catch (error: unknown) {
        await pool.query('ROLLBACK');
        console.error('Error updating user profile:', error);
        if (typeof error === 'object' && error !== null && 'code' in error && typeof (error as any).code === 'string') {
            if ((error as any).code === '23505') {
                return res.status(409).json({ message: 'Email already in use.' });
            }
        }
        res.status(500).json({ message: 'Server error updating profile.' });
    }
};

export { getProfile, updateProfile };