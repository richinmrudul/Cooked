import { Request, Response } from 'express';
import pool from '../db';
import { QueryResult } from 'pg';
import bcrypt from 'bcryptjs';

async function getUserStats(userId: string) {
    // Updated to remove macro calculation fetches, focusing on core stats
    const totalMealsResult = await pool.query('SELECT COUNT(*) AS total FROM meals WHERE user_id = $1', [userId]);
    const avgRatingResult = await pool.query('SELECT AVG(overall_rating)::numeric(10,2) AS avg_rating FROM meals WHERE user_id = $1', [userId]);
    const rankedMealsResult = await pool.query(
        // Fetches score, orders by score for top 5
        `SELECT
            r.score::numeric(10,2) AS score, m.id, m.title, m.description, m.photo_url, m.overall_rating, m.date_made
        FROM rankings r
        JOIN meals m ON r.meal_id = m.id
        WHERE r.user_id = $1
        ORDER BY r.score DESC
        LIMIT 5`,
        [userId]
    );

    return {
        totalMeals: parseInt(totalMealsResult.rows[0]?.total || '0'),
        averageRating: parseFloat(avgRatingResult.rows[0]?.avg_rating || '0'),
        topRankedMeals: rankedMealsResult.rows.map((row, index) => ({
            ...row,
            score: parseFloat(row.score),
            rank_position: index + 1
        })),
    };
}

const getProfile = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }

    try {
        const userResult: QueryResult = await pool.query(
            'SELECT id, first_name, last_name, email, created_at, profile_photo_url FROM users WHERE id = $1',
            [userId]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const stats = await getUserStats(userId);

        res.status(200).json({
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            createdAt: user.created_at,
            profilePhotoUrl: user.profile_photo_url,
            stats
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

    // These come from req.body (parsed by express.json or multer if file upload is on)
    const { firstName, lastName, email, password, currentPassword, profilePhotoUrl, photo_url_is_null } = req.body;

    try {
        await pool.query('BEGIN');

        const userResult: QueryResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
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

        let newProfilePhotoUrl: string | null = profilePhotoUrl; // Assumed to be URL from frontend
        if (photo_url_is_null === true || photo_url_is_null === 'true') { // Handle boolean or string 'true'
            newProfilePhotoUrl = null;
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