import React from 'react';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel'
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in" 
      role="alertdialog" 
      aria-modal="true" 
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 pt-1">
            <AlertTriangleIcon className="w-8 h-8 text-danger"/>
          </div>
          <div className="flex-grow">
            <h2 id="dialog-title" className="text-2xl font-bold mb-2">{title}</h2>
            <p id="dialog-description" className="text-pencil-light mb-6">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 bg-transparent hover:bg-highlighter border-2 border-pencil rounded-md transition-colors">{cancelText}</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-danger text-white rounded-md transition-transform transform hover:scale-105">{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
