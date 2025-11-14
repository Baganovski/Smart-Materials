import React, { useState, useEffect } from 'react';
import { UserSettings, CustomStatus, StatusGroup } from '../types';
import { getDefaultStatusGroups } from '../utils/defaults';
import DragHandleIcon from './icons/DragHandleIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import IconRenderer from './icons/IconRenderer';
import IconPicker from './IconPicker';
import ConfirmationModal from './ConfirmationModal';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ColorPicker from './ColorPicker';
import PencilIcon from './icons/PencilIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';


interface CustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
}

const CustomizeModal: React.FC<CustomizeModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [statusGroups, setStatusGroups] = useState<StatusGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<StatusGroup | null>(null);

  // For status editor view
  const [draggedStatus, setDraggedStatus] = useState<CustomStatus | null>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState<string | null>(null); 
  const [isColorPickerOpen, setIsColorPickerOpen] = useState<string | null>(null); 
  const [statusToDelete, setStatusToDelete] = useState<CustomStatus | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<StatusGroup | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [editingGroupNameId, setEditingGroupNameId] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setStatusGroups(JSON.parse(JSON.stringify(settings.statusGroups)));
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ statusGroups });
    setEditingGroup(null);
    onClose();
  };

  const handleConfirmReset = () => {
    setStatusGroups(getDefaultStatusGroups());
    setIsResetConfirmOpen(false);
  };
  
  // --- Group Management ---
  const handleAddGroup = () => {
    const newGroup: StatusGroup = {
      id: Date.now().toString(),
      name: 'New Workflow',
      statuses: [
        { id: 'new-1', name: 'To Do', icon: 'SquareIcon', color: '#333333' },
        { id: 'new-2', name: 'Done', icon: 'CheckSquareIcon', color: '#22c55e' },
      ],
    };
    setStatusGroups([...statusGroups, newGroup]);
  };

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
        setStatusGroups(statusGroups.filter(g => g.id !== groupToDelete.id));
        setGroupToDelete(null);
    }
  };
  
  const handleUpdateGroupName = (id: string, newName: string) => {
    setStatusGroups(statusGroups.map(g => g.id === id ? { ...g, name: newName } : g));
  };


  // --- Status Management (within a group) ---
  const handleAddStatus = () => {
    if (!editingGroup) return;
    const newStatus: CustomStatus = {
      id: Date.now().toString(),
      name: 'New Status',
      icon: 'SquareIcon',
      color: '#333333',
    };
    const updatedGroup = { ...editingGroup, statuses: [...editingGroup.statuses, newStatus] };
    setEditingGroup(updatedGroup);
    setStatusGroups(statusGroups.map(g => g.id === editingGroup.id ? updatedGroup : g));
  };

  const confirmDeleteStatus = () => {
    if (statusToDelete && editingGroup) {
        const updatedStatuses = editingGroup.statuses.filter(s => s.id !== statusToDelete.id);
        const updatedGroup = { ...editingGroup, statuses: updatedStatuses };
        setEditingGroup(updatedGroup);
        setStatusGroups(statusGroups.map(g => g.id === editingGroup.id ? updatedGroup : g));
        setStatusToDelete(null);
    }
  };

  const handleUpdateStatus = (id: string, updatedProps: Partial<CustomStatus>) => {
    if (!editingGroup) return;
    const updatedStatuses = editingGroup.statuses.map(s => (s.id === id ? { ...s, ...updatedProps } : s));
    const updatedGroup = { ...editingGroup, statuses: updatedStatuses };
    setEditingGroup(updatedGroup);
    setStatusGroups(statusGroups.map(g => g.id === editingGroup.id ? updatedGroup : g));
  };

  const handleDragStart = (e: React.DragEvent, status: CustomStatus) => {
    setDraggedStatus(status);
  };
  
  const handleDragOver = (e: React.DragEvent, hoverStatus: CustomStatus) => {
    e.preventDefault();
    if (!draggedStatus || draggedStatus.id === hoverStatus.id || !editingGroup) return;
  
    const dragIndex = editingGroup.statuses.findIndex(s => s.id === draggedStatus.id);
    const hoverIndex = editingGroup.statuses.findIndex(s => s.id === hoverStatus.id);
  
    const reorderedStatuses = [...editingGroup.statuses];
    const [movedItem] = reorderedStatuses.splice(dragIndex, 1);
    reorderedStatuses.splice(hoverIndex, 0, movedItem);
    
    const updatedGroup = { ...editingGroup, statuses: reorderedStatuses };
    setEditingGroup(updatedGroup);
    // No need to update the main list until drop
  };
  
  const handleDrop = () => {
    if (editingGroup) {
        setStatusGroups(statusGroups.map(g => g.id === editingGroup.id ? editingGroup : g));
    }
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

  const renderGroupList = () => (
    <>
      <h2 className="text-3xl font-bold mb-1">Customize Workflows</h2>
      <p className="text-pencil-light mb-6">Create and manage groups of statuses for your lists.</p>
      <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-2">
        {statusGroups.map(group => (
            <div key={group.id} className="flex items-center gap-3 p-2 rounded-md bg-paper md:hover:bg-highlighter/50">
                {editingGroupNameId === group.id ? (
                    <input
                        type="text"
                        defaultValue={group.name}
                        autoFocus
                        onFocus={e => e.target.select()}
                        className="w-full bg-highlighter text-pencil p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
                        onBlur={e => {
                            handleUpdateGroupName(group.id, e.target.value.trim() || 'Untitled');
                            setEditingGroupNameId(null);
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                handleUpdateGroupName(group.id, (e.target as HTMLInputElement).value.trim() || 'Untitled');
                                setEditingGroupNameId(null);
                            } else if (e.key === 'Escape') {
                                setEditingGroupNameId(null);
                            }
                        }}
                    />
                ) : (
                    <>
                        <span className="flex-grow font-bold text-xl p-2">{group.name}</span>
                        <button onClick={() => setEditingGroupNameId(group.id)} className="p-2 rounded-full md:hover:bg-ink/50" aria-label={`Rename ${group.name}`}>
                            <PencilIcon className="w-5 h-5"/>
                        </button>
                    </>
                )}
                <button onClick={() => setEditingGroup(group)} className="px-3 py-2 bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-md transition-colors text-sm">
                    Edit Statuses
                </button>
                {statusGroups.length > 1 && (
                    <button onClick={() => setGroupToDelete(group)} className="p-2 rounded-full md:hover:bg-danger/10 text-pencil-light md:hover:text-danger" aria-label={`Delete ${group.name}`}>
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                )}
            </div>
        ))}
      </div>
      <button onClick={handleAddGroup} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-dashed border-pencil/50 rounded-md transition-colors mb-6">
          <PlusIcon className="w-5 h-5" />
          <span>Add Workflow</span>
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
    </>
  );

  const renderStatusEditor = () => (
    <>
       <button onClick={() => setEditingGroup(null)} className="flex items-center gap-1 text-pencil-light md:hover:text-ink mb-4">
            <ChevronLeftIcon className="w-5 h-5" />
            <span>Back to Workflows</span>
       </button>
        <h2 className="text-3xl font-bold mb-1">Editing "{editingGroup?.name}"</h2>
        <p className="text-pencil-light mb-6">Define the statuses for this workflow.</p>
        <div 
            className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-2"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
        >
            {editingGroup?.statuses.map((status) => (
                <div
                    key={status.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, status)}
                    onDragOver={(e) => handleDragOver(e, status)}
                    className={`flex items-center gap-3 p-2 rounded-md transition-all ${draggedStatus?.id === status.id ? 'bg-highlighter opacity-50' : 'bg-paper md:hover:bg-highlighter/50'}`}
                >
                    <div className="cursor-grab text-pencil/50">
                        <DragHandleIcon className="w-6 h-6" />
                    </div>
                    <button onClick={() => setIsIconPickerOpen(status.id)} className="p-2 rounded-md md:hover:bg-ink/50" aria-label={`Change icon for ${status.name}`}>
                       <IconRenderer iconName={status.icon} className="w-6 h-6" style={{ color: status.color }} />
                    </button>
                    <button onClick={() => setIsColorPickerOpen(status.id)} className="w-6 h-6 rounded-full border-2 border-pencil/20" style={{ backgroundColor: status.color }} aria-label={`Change color for ${status.name}`} />
                    <input
                        type="text"
                        value={status.name}
                        onChange={(e) => handleUpdateStatus(status.id, { name: e.target.value })}
                        className="w-full bg-transparent text-pencil p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-ink border-2 border-transparent focus:border-pencil"
                    />
                    {editingGroup.statuses.length > 1 && (
                        <button onClick={() => setStatusToDelete(status)} className="p-2 rounded-full md:hover:bg-danger/10 text-pencil-light md:hover:text-danger" aria-label={`Delete status ${status.name}`}>
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            ))}
        </div>
        <button onClick={handleAddStatus} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-dashed border-pencil/50 rounded-md transition-colors mb-6">
            <PlusIcon className="w-5 h-5" />
            <span>Add Status</span>
        </button>
        <div className="flex justify-end gap-3">
            <button onClick={() => setEditingGroup(null)} className="px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-md transition-colors">Done</button>
        </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in">
      <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-lg relative">
        {editingGroup ? renderStatusEditor() : renderGroupList()}

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
            message={`Are you sure you want to delete the "${statusToDelete?.name}" status?`}
            onConfirm={confirmDeleteStatus}
            onCancel={() => setStatusToDelete(null)}
        />
         <ConfirmationModal
            isOpen={!!groupToDelete}
            title="Delete Workflow"
            message={`Are you sure you want to delete the "${groupToDelete?.name}" workflow? This action cannot be undone.`}
            onConfirm={confirmDeleteGroup}
            onCancel={() => setGroupToDelete(null)}
        />
        <ConfirmationModal
            isOpen={isResetConfirmOpen}
            title="Reset All Workflows"
            message="Are you sure you want to reset all workflows to the default? This cannot be undone."
            onConfirm={handleConfirmReset}
            onCancel={() => setIsResetConfirmOpen(false)}
            confirmText="Reset"
        />
      </div>
    </div>
  );
};

export default CustomizeModal;
