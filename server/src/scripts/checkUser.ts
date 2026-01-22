
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

async function checkUser() {
    const email = 'anto.suharyanto@gmail.com';
    console.log(`Checking DB for: ${email}`);

    const user = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (user) {
        console.log('User Found:', user);
        console.log('Upgrading to ORGANIZER...');
        await db.update(users)
            .set({ role: 'organizer' })
            .where(eq(users.email, email));
        console.log('Done.');
    } else {
        console.log('User NOT found in database.');
    }
    process.exit(0);
}

checkUser();
