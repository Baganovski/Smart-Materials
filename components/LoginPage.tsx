
import React, { useState } from 'react';
import { auth } from '../firebase';
import XMarkIcon from './icons/XMarkIcon';
import AppLogoIcon from './icons/AppLogoIcon';

type View = 'signIn' | 'signUp' | 'forgotPassword';

interface LoginPageProps {
    onClose?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onClose }) => {
    const [view, setView] = useState<View>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    const resetState = () => {
        setError(null);
        setMessage('');
        // Don't reset email/password so user doesn't have to re-type
    };

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        resetState();
        try {
            if (view === 'signUp') {
                if (password !== confirmPassword) {
                    setError('Passwords do not match.');
                    return;
                }
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                if (userCredential.user) {
                    // Attempt to send verification email, but don't block or fail the whole process if it fails
                    // (e.g. quota limits or network issues). The user is already created.
                    try {
                        await userCredential.user.sendEmailVerification();
                    } catch (emailError) {
                        console.warn("Failed to send verification email:", emailError);
                        // We continue anyway so the user can use the app
                    }
                    // Let the onAuthStateChanged listener in App.tsx handle the next step
                }
            } else { // 'signIn'
                await auth.signInWithEmailAndPassword(email, password);
                // Let the onAuthStateChanged listener in App.tsx handle verification check and redirect
            }
        } catch (err: any) {
            let friendlyMessage = "An unexpected error occurred. Please try again.";
            switch (err.code) {
                case 'auth/invalid-credential':
                case 'auth/invalid-login-credentials':
                case 'auth/wrong-password':
                case 'auth/user-not-found':
                    friendlyMessage = "Invalid email or password. Please check your credentials and try again.";
                    break;
                case 'auth/email-already-in-use':
                    friendlyMessage = "An account with this email address already exists. Please sign in or use a different email.";
                    break;
                case 'auth/weak-password':
                    friendlyMessage = "The password is too weak. It should be at least 6 characters long.";
                    break;
                case 'auth/invalid-email':
                    friendlyMessage = "Please enter a valid email address.";
                    break;
            }
            setError(friendlyMessage);
        }
    };
    
    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        resetState();
        if (!email) {
            setError('Please enter your email address.');
            return;
        }
        try {
            await auth.sendPasswordResetEmail(email);
            setMessage('Password reset email sent! Please check your inbox and spam folder.');
        } catch (err: any) {
            let friendlyMessage = "Failed to send reset email. Please try again.";
            if (err.code === 'auth/invalid-email') {
                friendlyMessage = "Please enter a valid email address.";
            } else if (err.code === 'auth/user-not-found') {
                friendlyMessage = "No account found with this email address."
            }
            setError(friendlyMessage);
        }
    };

    const getPageTitle = () => {
        switch(view) {
            case 'forgotPassword': return 'Reset your password.';
            case 'signUp': return 'Create an account to save your lists.';
            case 'signIn': return 'Sign in to access your lists.';
        }
    }

    const renderContent = () => {
        switch(view) {
            case 'forgotPassword':
                return (
                    <form onSubmit={handlePasswordReset}>
                        <h2 className="text-3xl font-bold mb-6 text-pencil">Reset Password</h2>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            required
                            className="w-full bg-paper text-pencil placeholder-pencil-light p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
                            aria-label="Email Address"
                        />
                        {error && <p className="text-danger text-sm mb-4">{error}</p>}
                        {message && <p className="text-green-600 text-sm mb-4 font-bold">{message}</p>}
                        <button
                            type="submit"
                            className="w-full bg-ink md:hover:bg-ink-light text-pencil text-xl font-bold py-3 px-6 rounded-full shadow-sketchy md:hover:shadow-sketchy-hover transition-all duration-200"
                        >
                            Send Reset Link
                        </button>
                    </form>
                );
            case 'signIn':
            case 'signUp':
                return (
                    <form onSubmit={handleAuthAction}>
                        <h2 className="text-3xl font-bold mb-6 text-pencil">{view === 'signUp' ? 'Sign Up' : 'Sign In'}</h2>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            required
                            className="w-full bg-paper text-pencil placeholder-pencil-light p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
                            aria-label="Email Address"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                            className="w-full bg-paper text-pencil placeholder-pencil-light p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
                            aria-label="Password"
                        />
                        {view === 'signUp' && (
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm Password"
                                required
                                className="w-full bg-paper text-pencil placeholder-pencil-light p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
                                aria-label="Confirm Password"
                            />
                        )}
                        
                        {error && <p className="text-danger text-sm mb-4">{error}</p>}
                        
                        <button
                            type="submit"
                            className="w-full bg-ink md:hover:bg-ink-light text-pencil text-xl font-bold py-3 px-6 rounded-full shadow-sketchy md:hover:shadow-sketchy-hover transition-all duration-200"
                        >
                            {view === 'signUp' ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>
                );
        }
    }

    const renderFooter = () => {
        if (view === 'forgotPassword') {
            return (
                <button onClick={() => { setView('signIn'); resetState(); }} className="text-pencil-light md:hover:text-ink transition-colors">
                    Back to Sign In
                </button>
            )
        }

        return (
            <>
                <button onClick={() => { setView('forgotPassword'); resetState(); }} className="text-pencil-light md:hover:text-ink transition-colors">
                    Forgot Password?
                </button>
                <button
                    onClick={() => {
                        setView(view === 'signIn' ? 'signUp' : 'signIn');
                        resetState();
                        setConfirmPassword('');
                    }}
                    className="text-pencil-light md:hover:text-ink transition-colors"
                >
                    {view === 'signIn' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                </button>
            </>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 relative bg-paper/90 backdrop-blur-sm animate-pop-in z-50">
             {onClose && (
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-pencil-light hover:text-pencil transition-colors"
                    aria-label="Close login"
                >
                    <XMarkIcon className="w-10 h-10" />
                </button>
            )}
            <div className="flex items-center gap-3 mb-4">
                <AppLogoIcon className="w-12 h-12 sm:w-16 sm:h-16" />
                <h1 className="text-6xl sm:text-7xl font-bold text-pencil">Listfully</h1>
            </div>
            <p className="text-xl text-pencil-light max-w-2xl mb-12">
                {getPageTitle()}
            </p>

            <div className="relative w-full max-w-sm bg-sticky-note transform -rotate-2 shadow-sketchy">
                {/* Adhesive strip - Color removed */}
                <div className="absolute top-0 left-0 right-0 h-10" />

                <div className="relative pt-12 px-8 pb-8">
                    {renderContent()}
                    <div className="mt-6 flex flex-col items-center gap-2">
                        {renderFooter()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
