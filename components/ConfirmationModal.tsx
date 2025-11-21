
import React, { useState, useEffect } from 'react';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  requireVerification?: string;
  verificationInstruction?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  requireVerification,
  verificationInstruction
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = requireVerification ? inputValue !== requireVerification : false;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in" 
      role="alertdialog" 
      aria-modal="true" 
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div className="bg-paper p-6 rounded-2xl border-2 border-pencil shadow-sketchy w-full max-w-sm">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 pt-1">
            <AlertTriangleIcon className="w-8 h-8 text-danger"/>
          </div>
          <div className="flex-grow">
            <h2 id="dialog-title" className="text-2xl font-bold mb-2">{title}</h2>
            <p id="dialog-description" className="text-pencil-light">{message}</p>
          </div>
        </div>

        {requireVerification && (
            <div className="mb-6">
                <label className="block text-sm font-bold text-pencil-light mb-2">
                    {verificationInstruction || `Type "${requireVerification}" to confirm`}
                </label>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={requireVerification}
                    className="w-full bg-paper p-3 rounded-xl border-2 border-pencil focus:outline-none focus:ring-2 focus:ring-danger placeholder-pencil-light/50 font-bold"
                    autoComplete="off"
                    onPaste={(e) => e.preventDefault()}
                />
            </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-full transition-colors">{cancelText}</button>
          <button 
            onClick={onConfirm} 
            disabled={isConfirmDisabled}
            className={`px-4 py-2 text-white rounded-full transition-transform transform ${
                isConfirmDisabled 
                ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                : 'bg-danger md:hover:scale-105'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;