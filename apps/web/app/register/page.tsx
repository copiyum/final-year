'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Mail, Lock, User } from 'lucide-react';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultRole = searchParams.get('role') || 'founder';

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: defaultRole as 'founder' | 'investor'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007';
            const response = await fetch(`${apiUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            const data = await response.json();
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Set HTTP-only cookie for middleware
            await fetch('/api/auth/set-cookie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: data.accessToken })
            });

            // Redirect to appropriate dashboard
            if (formData.role === 'founder') {
                router.push('/dashboard/startup');
            } else {
                router.push('/dashboard/investor');
            }
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black bg-dot-white/[0.2] flex items-center justify-center px-6 relative">
            {/* Radial gradient for the container to give a faded look */}
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <Shield className="w-8 h-8 text-white" />
                        <span className="text-2xl font-bold text-white tracking-tight">ZKP Ledger</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Create Account</h1>
                    <p className="text-zinc-400">Join the privacy-first fundraising platform</p>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-8 border border-zinc-800 shadow-xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-3">
                                I am a...
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'founder' })}
                                    className={`p-4 rounded-xl border transition-all ${formData.role === 'founder'
                                        ? 'border-white bg-white text-black'
                                        : 'border-zinc-700 bg-black text-zinc-400 hover:border-zinc-500'
                                        }`}
                                >
                                    <User className={`w-6 h-6 mx-auto mb-2 ${formData.role === 'founder' ? 'text-black' : 'text-zinc-400'}`} />
                                    <span className="font-medium">Founder</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'investor' })}
                                    className={`p-4 rounded-xl border transition-all ${formData.role === 'investor'
                                        ? 'border-white bg-white text-black'
                                        : 'border-zinc-700 bg-black text-zinc-400 hover:border-zinc-500'
                                        }`}
                                >
                                    <Shield className={`w-6 h-6 mx-auto mb-2 ${formData.role === 'investor' ? 'text-black' : 'text-zinc-400'}`} />
                                    <span className="font-medium">Investor</span>
                                </button>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-white hover:bg-zinc-200 disabled:bg-zinc-600 text-black rounded-lg font-semibold transition-colors"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-zinc-500 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-white hover:text-zinc-300 font-medium underline underline-offset-4">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
