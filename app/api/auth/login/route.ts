import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AdminUser } from '@/types'; // Import AdminUser type

export async function POST(request: Request) {
    try {
        const { uid, username, password } = await request.json();

        // Ensure at least one login method is provided
        if (!uid && (!username || !password)) {
            return NextResponse.json({ error: 'NFC UID or Username and Password are required for login.' }, { status: 400 });
        }

        let query = supabase.from('admin_users').select('*').limit(1); // Fetch only one user

        if (uid) {
            query = query.eq('uid', uid);
        } else if (username && password) {
            query = query.eq('username', username).eq('password', password); // Plaintext password check for demo
            // In production, NEVER store plaintext passwords. Use `bcrypt` or a similar library to compare hashed passwords.
            // For example:
            // const { data: users, error: userFetchError } = await supabase.from('admin_users').select('*, password_hash').eq('username', username).limit(1);
            // if (userFetchError || !users || users.length === 0) { throw new Error('Invalid username or password.'); }
            // const user = users[0];
            // const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            // if (!isPasswordValid) { throw new Error('Invalid username or password.'); }
            // return NextResponse.json({ id: user.id, username: user.username, role: user.role }, { status: 200 });
        } else {
            // This case should ideally not be hit due to the initial check, but as a safeguard
            return NextResponse.json({ error: 'Invalid login attempt.' }, { status: 400 });
        }

        const { data: users, error } = await query;

        if (error) {
            console.error('Supabase error during login:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!users || users.length === 0) {
            return NextResponse.json({ error: 'Invalid UID or credentials.' }, { status: 401 });
        }

        // Login successful
        const user: AdminUser = users[0];
        // Return user data (excluding sensitive info like password in production)
        return NextResponse.json({
            id: user.id,
            uid: user.uid,
            username: user.username,
            role: user.role,
        }, { status: 200 });

    } catch (error: any) {
        console.error('API error during login:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}