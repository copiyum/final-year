'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../api';

export function useAuth(requiredRole?: 'founder' | 'investor') {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        try {
            const parsedUser = JSON.parse(userData) as User;
            
            // Check if user has required role
            if (requiredRole && parsedUser.role !== requiredRole) {
                const redirectPath = parsedUser.role === 'founder' 
                    ? '/dashboard/startup' 
                    : '/dashboard/investor';
                router.push(redirectPath);
                return;
            }

            setUser(parsedUser);
        } catch (error) {
            console.error('Failed to parse user data:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }, [router, requiredRole]);

    const logout = async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Clear HTTP-only cookie
        await fetch('/api/auth/set-cookie', {
            method: 'DELETE'
        });
        
        router.push('/');
    };

    return { user, loading, logout };
}
