import React, { useState } from 'react';
import { auth } from '../firebase';

// This tells TypeScript that a 'firebase' object exists in the global scope
declare const firebase: any;

const LoginPage: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            if (isSignUp) {
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                await auth.signInWithEmailAndPassword(email, password);
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


    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-6xl sm:text-7xl font-bold text-pencil mb-4">Sticky Tickys</h1>
            <p className="text-xl text-pencil-light max-w-2xl mb-12">
                {isSignUp ? 'Create an account to save your lists.' : 'Sign in to access your lists.'}
            </p>

            <div className="relative w-full max-w-sm bg-sticky-note transform -rotate-2">
                {/* Adhesive strip */}
                <div className="absolute top-0 left-0 right-0 h-10 bg-black/5 border-b border-black/10" />

                <div className="relative pt-12 px-8 pb-8">
                    <form onSubmit={handleSubmit}>
                        <h2 className="text-3xl font-bold mb-6 text-pencil">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            required
                            className="w-full bg-paper text-pencil placeholder-pencil-light p-3 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
                            aria-label="Email Address"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                            className="w-full bg-paper text-pencil placeholder-pencil-light p-3 rounded-md mb-6 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
                            aria-label="Password"
                        />
                        
                        {error && <p className="text-danger text-sm mb-4">{error}</p>}
                        
                        <button
                            type="submit"
                            className="w-full bg-ink hover:bg-ink-light text-pencil text-xl font-bold py-3 px-6 rounded-lg shadow-sketchy hover:shadow-sketchy-hover transition-all duration-200"
                        >
                            {isSignUp ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                        }}
                        className="mt-6 text-pencil-light hover:text-ink transition-colors"
                    >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;