import React, { useState, useEffect } from 'react';
import { UserSettings, CustomStatus } from '../types';
import { getDefaultStatuses, ALL_ICONS } from '../utils/defaults';
import DragHandleIcon from './icons/DragHandleIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import IconRenderer from './icons/IconRenderer';
import IconPicker from './IconPicker';
import ConfirmationModal from './ConfirmationModal';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ColorPicker from './ColorPicker'; // Import the new color picker

interface CustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
}

const CustomizeModal: React.FC<CustomizeModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [draggedStatus, setDraggedStatus] = useState<CustomStatus | null>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState<string | null>(null); // Holds the ID of the status being edited
  const [isColorPickerOpen, setIsColorPickerOpen] = useState<string | null>(null); // Holds the ID for color editing
  const [statusToDelete, setStatusToDelete] = useState<CustomStatus | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    // Deep copy settings to avoid mutating props directly
    if (settings) {
      setStatuses(JSON.parse(JSON.stringify(settings.statuses)));
    }
  }, [settings, isOpen]); // Reset state when modal opens/settings change

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ statuses });
    onClose();
  };

  const handleConfirmReset = () => {
    setStatuses(getDefaultStatuses());
    setIsResetConfirmOpen(false);
  };

  const handleAddStatus = () => {
    const newStatus: CustomStatus = {
      id: Date.now().toString(),
      name: 'New Status',
      icon: 'SquareIcon',
      color: '#333333', // Default color
    };
    setStatuses([...statuses, newStatus]);
  };

  const handleDeleteStatus = (id: string) => {
    const status = statuses.find(s => s.id === id);
    if (status) {
        setStatusToDelete(status);
    }
  };

  const confirmDelete = () => {
    if (statusToDelete) {
        setStatuses(statuses.filter(s => s.id !== statusToDelete.id));
        setStatusToDelete(null);
    }
  };


  const handleUpdateStatus = (id: string, updatedProps: Partial<CustomStatus>) => {
    setStatuses(
      statuses.map(s => (s.id === id ? { ...s, ...updatedProps } : s))
    );
  };

  const handleDragStart = (e: React.DragEvent, status: CustomStatus) => {
    setDraggedStatus(status);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', status.id);
  };
  
  const handleDragOver = (e: React.DragEvent, hoverStatus: CustomStatus) => {
    e.preventDefault();
    if (!draggedStatus || draggedStatus.id === hoverStatus.id) return;
  
    const dragIndex = statuses.findIndex(s => s.id === draggedStatus.id);
    const hoverIndex = statuses.findIndex(s => s.id === hoverStatus.id);
  
    if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) return;
  
    const reorderedStatuses = [...statuses];
    const [movedItem] = reorderedStatuses.splice(dragIndex, 1);
    reorderedStatuses.splice(hoverIndex, 0, movedItem);
  
    setStatuses(reorderedStatuses);
  };
  
  const handleDragEnd = () => {
    setDraggedStatus(null);
  };

  const handleSelectIcon = (iconName: string) => {
    if (isIconPickerOpen) {
      handleUpdateStatus(isIconPickerOpen, { icon: iconName });
    }
    setIsIconPickerOpen(null);
  };

  const handleSelectColor = (color: string) => {
    if (isColorPickerOpen) {
      handleUpdateStatus(isColorPickerOpen, { color: color });
    }
    setIsColorPickerOpen(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in">
      <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-md relative">
        <h2 className="text-3xl font-bold mb-1">Customize Statuses</h2>
        <p className="text-pencil-light mb-6">Define the workflow for your list items.</p>

        <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-2">
            {statuses.map((status) => {
                const isDragging = draggedStatus?.id === status.id;
                return (
                    <div
                        key={status.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, status)}
                        onDragOver={(e) => handleDragOver(e, status)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-3 p-2 rounded-md transition-all ${isDragging ? 'bg-highlighter opacity-50' : 'bg-paper md:hover:bg-highlighter/50'}`}
                    >
                        <div className="cursor-grab text-pencil/50">
                            <DragHandleIcon className="w-6 h-6" />
                        </div>
                        <button
                            onClick={() => setIsIconPickerOpen(status.id)}
                            className="p-2 rounded-md md:hover:bg-ink/50 transition-colors"
                            aria-label={`Change icon for ${status.name}`}
                        >
                           <IconRenderer iconName={status.icon} className="w-6 h-6" style={{ color: status.color || '#333333' }} />
                        </button>
                        <button
                          onClick={() => setIsColorPickerOpen(status.id)}
                          className="w-6 h-6 rounded-full border-2 border-pencil/20 transition-transform transform md:hover:scale-110"
                          style={{ backgroundColor: status.color || '#cccccc' }}
                          aria-label={`Change color for ${status.name}`}
                        />
                        <input
                            type="text"
                            value={status.name}
                            onChange={(e) => handleUpdateStatus(status.id, { name: e.target.value })}
                            className="w-full bg-transparent text-pencil p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-ink border-2 border-transparent focus:border-pencil"
                        />
                        {statuses.length > 1 && (
                            <button
                                onClick={() => handleDeleteStatus(status.id)}
                                className="p-2 rounded-full md:hover:bg-danger/10 text-pencil-light md:hover:text-danger transition-colors"
                                aria-label={`Delete status ${status.name}`}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
        
        <button onClick={handleAddStatus} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-dashed border-pencil/50 rounded-md transition-colors mb-6">
            <PlusIcon className="w-5 h-5" />
            <span>Add Status</span>
        </button>

        <div className="flex justify-between items-center gap-3">
          <button onClick={() => setIsResetConfirmOpen(true)} className="px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-md transition-colors flex items-center gap-2" title="Reset to default statuses">
            <ArrowPathIcon className="w-5 h-5"/>
            <span>Reset</span>
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-md transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-ink md:hover:bg-ink-light text-pencil font-bold rounded-md transition-colors">Save</button>
          </div>
        </div>

        {isIconPickerOpen && (
            <IconPicker
                onSelect={handleSelectIcon}
                onClose={() => setIsIconPickerOpen(null)}
            />
        )}
        {isColorPickerOpen && (
            <ColorPicker
                onSelect={handleSelectColor}
                onClose={() => setIsColorPickerOpen(null)}
            />
        )}
        <ConfirmationModal
            isOpen={!!statusToDelete}
            title="Delete Status"
            message={`Are you sure you want to delete the "${statusToDelete?.name}" status? This action is permanent.`}
            onConfirm={confirmDelete}
            onCancel={() => setStatusToDelete(null)}
            confirmText="Delete"
        />
        <ConfirmationModal
            isOpen={isResetConfirmOpen}
            title="Reset Statuses"
            message="Are you sure you want to reset all statuses to their default values? This cannot be undone."
            onConfirm={handleConfirmReset}
            onCancel={() => setIsResetConfirmOpen(false)}
            confirmText="Reset"
        />
      </div>
    </div>
  );
};

export default CustomizeModal;