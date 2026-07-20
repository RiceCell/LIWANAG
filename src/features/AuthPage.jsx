import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { Mail, Lock, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, WifiOff } from 'lucide-react';

// Supabase's raw error strings are written for developers, not for someone
// trying to get into a shelter map during a brownout. Translate the common
// ones into plain, actionable language.
function friendlyAuthError(message) {
    if (!message) return 'Something went wrong. Please try again.';
    const m = message.toLowerCase();
    if (m.includes('invalid login credentials')) return "That email and password don't match. Check for typos, or sign up if you're new.";
    if (m.includes('user already registered')) return 'An account with this email already exists. Try signing in instead.';
    if (m.includes('password should be at least')) return 'Password needs to be at least 6 characters.';
    if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the link we sent.';
    if (m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.';
    return message;
}

export default function AuthPage({ onAuthSuccess, onBack }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const isOffline = useOfflineStatus();

    const handleAuth = async (e) => {
        e.preventDefault();
        setError(null);
        setNotice(null);

        if (password.length < 6) {
            setError('Password needs to be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            const trimmedEmail = email.trim();
            let result;
            if (isSignUp) {
                result = await supabase.auth.signUp({ email: trimmedEmail, password });
            } else {
                result = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
            }

            if (result.error) throw result.error;

            if (result.data.session) {
                onAuthSuccess();
            } else if (isSignUp) {
                // Supabase requires email verification by default
                setNotice('Almost there — check your email for a confirmation link to finish signing up.');
            }
        } catch (err) {
            setError(friendlyAuthError(err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col justify-center h-full overflow-y-auto bg-slate-50 px-6 py-12 animate-in fade-in duration-300">
            <div className="w-full max-w-md mx-auto">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm font-semibold mb-4 transition-colors focus:outline-none"
                        aria-label="Back to welcome screen"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                )}

                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-extrabold text-slate-800">
                            {isSignUp ? 'Create an Account' : 'Welcome Back'}
                        </h2>
                        <p className="text-slate-500 text-sm mt-2">
                            {isSignUp ? 'Join the Community Energy Network' : 'Sign in to access your LIWANAG dashboard'}
                        </p>
                    </div>

                    {isOffline && (
                        <div className="mb-6 flex items-start gap-2 bg-slate-100 text-slate-600 p-3 rounded-xl text-sm font-medium">
                            <WifiOff size={18} className="shrink-0 mt-0.5" />
                            <span>You're offline, so signing in isn't possible right now. Reconnect and try again.</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 flex items-start gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100" role="alert">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {notice && (
                        <div className="mb-6 flex items-start gap-2 bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm font-medium border border-emerald-100" role="status">
                            <Mail size={18} className="shrink-0 mt-0.5" />
                            <span>{notice}</span>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    disabled={isOffline}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-60"
                                    placeholder="juan@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    disabled={isOffline}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-3 pl-11 pr-11 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-60"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || isOffline}
                            className="w-full bg-brand-500 hover:bg-brand-900 text-white font-bold text-lg py-3.5 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 mt-4 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500"
                        >
                            {loading && <Loader2 size={20} className="animate-spin" />}
                            {isSignUp ? 'Sign Up' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                                setNotice(null);
                            }}
                            className="text-sm font-semibold text-slate-500 hover:text-brand-500 transition-colors"
                        >
                            {isSignUp
                                ? 'Already have an account? Sign In'
                                : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}