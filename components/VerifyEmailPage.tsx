import React, { useState } from 'react';
import { auth } from '../firebase';

interface VerifyEmailPageProps {
  user: any; // Firebase user object
}

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ user }) => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isResending, setIsResending] = useState(false);

    const handleResend = async () => {
        setMessage('');
        setError('');
        setIsResending(true);
        try {
            await user.sendEmailVerification();
            setMessage('A new verification link has been sent to your email.');
        } catch (err) {
            setError('Failed to send verification email. Please try again in a few moments.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-6xl sm:text-7xl font-bold text-pencil mb-4">Listfully</h1>
            <p className="text-xl text-pencil-light max-w-2xl mb-12">
                One last step!
            </p>

            <div className="relative w-full max-w-sm bg-sticky-note transform -rotate-2">
                <div className="absolute top-0 left-0 right-0 h-10 bg-sticky-note-top" />

                <div className="relative pt-12 px-8 pb-8">
                     <div className="text-center">
                        <h2 className="text-3xl font-bold mb-4 text-pencil">Verify Your Email</h2>
                        <p className="text-pencil-light mb-6">
                            We've sent a verification link to <strong>{user.email}</strong>. Please check your inbox and click the link to activate your account.
                        </p>
                        {message && <p className="text-green-600 text-sm mb-4">{message}</p>}
                        {error && <p className="text-danger text-sm mb-4">{error}</p>}
                        <div className="flex flex-col gap-4">
                            <button
                               onClick={handleResend}
                               disabled={isResending}
                               className="w-full bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-md transition-colors py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               {isResending ? 'Sending...' : 'Resend Verification Email'}
                            </button>
                            <button
                               onClick={() => auth.signOut()}
                               className="w-full bg-ink md:hover:bg-ink-light text-pencil text-xl font-bold py-3 px-6 rounded-lg shadow-sketchy md:hover:shadow-sketchy-hover transition-all duration-200"
                            >
                               Back to Sign In
                            </button>
                        </div>
                   </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
