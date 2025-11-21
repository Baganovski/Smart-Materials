
import React, { useState } from 'react';
import { auth } from '../firebase';
import ArrowPathIcon from './icons/ArrowPathIcon';
import AppLogoIcon from './icons/AppLogoIcon';

interface VerifyEmailPageProps {
  user: any; // Firebase user object
  onCheckVerification: () => Promise<void>;
}

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ user, onCheckVerification }) => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const handleResend = async () => {
        setMessage('');
        setError('');
        setIsResending(true);
        try {
            await user.sendEmailVerification();
            setMessage('A new verification link has been sent. Please check your inbox and SPAM folder.');
        } catch (err) {
            setError('Failed to send verification email. Please try again in a few moments.');
        } finally {
            setIsResending(false);
        }
    };

    const handleCheckAgain = async () => {
        setIsChecking(true);
        setError('');
        try {
            await onCheckVerification();
            // If successful, the parent component will unmount this page, so no need to reset loading
        } catch (err: any) {
            if (err.message === "Not verified") {
                setError("We couldn't verify your email yet. Please check your inbox and click the link.");
            } else {
                setError("Something went wrong. Please try refreshing the page.");
            }
            setIsChecking(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
            <div className="flex items-center gap-3 mb-4">
                <AppLogoIcon className="w-12 h-12 sm:w-16 sm:h-16" />
                <h1 className="text-6xl sm:text-7xl font-bold text-pencil">Listfully</h1>
            </div>
            <p className="text-xl text-pencil-light max-w-2xl mb-12">
                One last step!
            </p>

            <div className="relative w-full max-w-sm bg-sticky-note transform -rotate-2 shadow-sketchy">
                <div className="absolute top-0 left-0 right-0 h-10 bg-sticky-note-top" />

                <div className="relative pt-12 px-8 pb-8">
                     <div className="text-center">
                        <h2 className="text-3xl font-bold mb-4 text-pencil">Verify Your Email</h2>
                        <p className="text-pencil-light mb-6">
                            We've sent a verification link to <strong>{user.email}</strong>.
                        </p>
                        <div className="bg-paper border-2 border-pencil/20 p-3 rounded-xl mb-6 text-sm font-bold text-pencil/80">
                            <p>Please check your Inbox and <span className="text-danger uppercase">Spam Folder</span>.</p>
                        </div>
                        
                        {message && <p className="text-green-600 text-sm mb-4 font-bold">{message}</p>}
                        {error && <p className="text-danger text-sm mb-4 font-bold">{error}</p>}
                        
                        <div className="flex flex-col gap-4">
                             <button
                               onClick={handleCheckAgain}
                               disabled={isChecking}
                               className="w-full bg-ink md:hover:bg-ink-light text-pencil text-xl font-bold py-3 px-6 rounded-full shadow-sketchy md:hover:shadow-sketchy-hover transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                               <ArrowPathIcon className={`w-6 h-6 ${isChecking ? 'animate-spin' : ''}`} />
                               {isChecking ? 'Checking...' : "I've Verified My Email"}
                            </button>
                            <button
                               onClick={handleResend}
                               disabled={isResending}
                               className="w-full bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-full transition-colors py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
                            >
                               {isResending ? 'Sending...' : 'Resend Verification Email'}
                            </button>
                            <button
                               onClick={() => auth.signOut()}
                               className="w-full text-pencil-light hover:text-ink transition-colors py-2 text-sm"
                            >
                               Sign Out / Use Different Email
                            </button>
                        </div>
                   </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
