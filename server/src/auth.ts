import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { Request } from 'express';

dotenv.config();

console.log('[Auth] Initializing dedicated Auth Pool...');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
    // No idle timeout for auth to ensure readiness? Or standard.
});
pool.on('error', (err) => console.error('[AuthPool] Unexpected error:', err));

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
        const start = Date.now();
        console.log('[AuthDebug] Google Callback Started');
        console.log('[AuthDebug] Profile ID:', profile?.id);

        try {
            const email = profile.emails?.[0].value;
            const googleId = profile.id;
            const displayName = profile.displayName;
            const photo = profile.photos?.[0].value;

            console.log(`[AuthDebug] Processing user: ${email} (${googleId})`);

            if (!email) {
                console.error('[AuthDebug] No email found in profile');
                return done(new Error('No email found in Google profile'), undefined);
            }

            // Check if user exists
            console.log('[AuthDebug] Querying DB for user...');
            let res = await pool.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [googleId, email]);
            console.log(`[AuthDebug] DB Query Result: ${res.rows.length} rows`);

            if (res.rows.length > 0) {
                // User exists
                const user = res.rows[0];
                if (!user.google_id) {
                    console.log('[AuthDebug] Linking existing user to Google ID');
                    await pool.query('UPDATE users SET google_id = $1, picture = $2 WHERE email = $3', [googleId, photo, email]);
                    const updated = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
                    return done(null, updated.rows[0]);
                }
                console.log('[AuthDebug] User found and linked. Done.');
                return done(null, user);
            } else {
                // Create new user
                console.log('[AuthDebug] Creating NEW user...');
                const newUserQuery = `
          INSERT INTO users (google_id, email, full_name, picture, role, membership_type) 
          VALUES ($1, $2, $3, $4, 'user', 'general') 
          RETURNING *
        `;
                res = await pool.query(newUserQuery, [googleId, email, displayName, photo]);
                console.log('[AuthDebug] New user created:', res.rows[0].id);
                return done(null, res.rows[0]);
            }
        } catch (err: any) {
            console.error('[AuthDebug] CRITICAL ERROR in strategy:', err);
            return done(err, undefined);
        } finally {
            console.log(`[AuthDebug] Callback took ${Date.now() - start}ms`);
        }
    }
));

export default passport;
