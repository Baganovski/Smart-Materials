
import React, { useState } from 'react';
import { auth } from '../firebase';
import XMarkIcon from './icons/XMarkIcon';
import TrashIcon from './icons/TrashIcon';
import CogIcon from './icons/CogIcon';
import CheckIcon from './icons/CheckIcon';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onRequestDeleteAccount: () => void;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onRequestDeleteAccount 
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handlePasswordReset = async () => {
    if (user?.email) {
      setMessage('');
      setIsSending(true);
      try {
        await auth.sendPasswordResetEmail(user.email);
        setMessage('Password reset email sent! Check your inbox and spam folder.');
      } catch (error: any) {
        console.error("Error sending password reset email:", error);
        setMessage(`Error: ${error.message}`);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleResendVerification = async () => {
    if (user) {
      setMessage('');
      setIsSending(true);
      try {
        await user.sendEmailVerification();
        setMessage('Verification email sent! Check your inbox and spam folder.');
      } catch (error: any) {
        console.error("Error sending verification email:", error);
        setMessage(`Error: ${error.message}`);
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in p-4">
      <div className="bg-paper p-6 rounded-2xl border-2 border-pencil shadow-sketchy w-full max-w-md relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-pencil-light hover:text-pencil transition-colors"
            aria-label="Close settings"
        >
            <XMarkIcon className="w-8 h-8" />
        </button>

        <div className="flex items-center gap-3 mb-6">
            <CogIcon className="w-8 h-8 text-pencil" />
            <h2 className="text-2xl font-bold">Account Settings</h2>
        </div>

        <div className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-pencil-light mb-1">Email Address</label>
                <div className="w-full bg-paper p-3 rounded-xl border-2 border-pencil text-pencil opacity-70 select-all flex justify-between items-center">
                    <span className="truncate mr-2">{user.email}</span>
                    {user.emailVerified ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm font-bold flex-shrink-0">
                            <CheckIcon className="w-4 h-4" /> Verified
                        </span>
                    ) : (
                        <span className="text-pencil-light text-xs bg-pencil/10 px-2 py-1 rounded-full flex-shrink-0">Unverified</span>
                    )}
                </div>
                {!user.emailVerified && (
                    <button 
                        onClick={handleResendVerification}
                        disabled={isSending}
                        className="mt-2 text-sm text-ink font-bold hover:underline disabled:opacity-50"
                    >
                        {isSending ? 'Sending...' : 'Resend Verification Email'}
                    </button>
                )}
            </div>

            <div>
                <label className="block text-sm font-bold text-pencil-light mb-1">Password</label>
                <button 
                    onClick={handlePasswordReset}
                    disabled={isSending}
                    className="w-full text-left px-4 py-3 bg-highlighter md:hover:bg-highlighter/80 border-2 border-transparent md:hover:border-pencil rounded-xl transition-all text-pencil font-bold disabled:opacity-50"
                >
                    {isSending ? 'Sending...' : 'Send Password Reset Email'}
                </button>
                {message && (
                    <p className={`text-sm mt-2 ${message.includes('Error') ? 'text-danger' : 'text-green-600'}`}>
                        {message}
                    </p>
                )}
            </div>

            <div className="pt-6 border-t-2 border-dashed border-pencil/20">
                <label className="block text-sm font-bold text-danger mb-1">Danger Zone</label>
                <p className="text-sm text-pencil-light mb-3">
                    Permanently delete your account and all lists. This cannot be undone.
                </p>
                <button 
                    onClick={() => {
                        onClose();
                        onRequestDeleteAccount();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-transparent md:hover:bg-danger/10 border-2 border-danger/30 md:hover:border-danger text-danger rounded-xl transition-all font-bold"
                >
                    <TrashIcon className="w-5 h-5" />
                    Delete Account
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsModal;
