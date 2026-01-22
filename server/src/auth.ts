import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { Request } from 'express';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Serialize user to session
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
    try {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, res.rows[0]);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    passReqToCallback: true
},
    async (req: Request, accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0].value;
            const googleId = profile.id;
            const displayName = profile.displayName;
            const photo = profile.photos?.[0].value;

            if (!email) {
                return done(new Error('No email found in Google profile'), undefined);
            }

            // Check if user exists
            let res = await pool.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [googleId, email]);

            if (res.rows.length > 0) {
                // User exists, update info if needed (optional)
                const user = res.rows[0];
                if (!user.google_id) {
                    // Link Google ID if only email existed
                    await pool.query('UPDATE users SET google_id = $1, picture = $2 WHERE email = $3', [googleId, photo, email]);
                    // Refresh user object
                    const updated = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
                    return done(null, updated.rows[0]);
                }
                return done(null, user);
            } else {
                // Create new user
                const newUserQuery = `
          INSERT INTO users (google_id, email, full_name, picture, role, membership_type) 
          VALUES ($1, $2, $3, $4, 'user', 'general') 
          RETURNING *
        `;
                res = await pool.query(newUserQuery, [googleId, email, displayName, photo]);
                return done(null, res.rows[0]);
            }
        } catch (err: any) {
            return done(err, undefined);
        }
    }
));

export default passport;
