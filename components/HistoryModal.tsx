import React, { useState, useEffect, useMemo } from 'react';
import * as historyService from '../services/historyService';
import TrashIcon from './icons/TrashIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import SearchIcon from './icons/SearchIcon';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, user }) => {
  const [historyItems, setHistoryItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      setIsLoading(true);
      setError('');
      setSearchTerm('');
      historyService.getHistory(user.uid)
        .then(items => {
          setHistoryItems(items.sort((a, b) => a.localeCompare(b)));
        })
        .catch(() => setError('Could not load item history.'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, user]);

  const handleDeleteItem = async (item: string) => {
    // Optimistically update UI
    setHistoryItems(prevItems => prevItems.filter(i => i !== item));
    try {
      await historyService.removeHistoryItem(user.uid, item);
    } catch (err) {
      // Revert if error
      setError('Could not delete item. Please try again.');
      setHistoryItems(prevItems => [...prevItems, item].sort((a, b) => a.localeCompare(b)));
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return historyItems;
    }
    return historyItems.filter(item =>
      item.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [historyItems, searchTerm]);

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in">
      <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-md flex flex-col" style={{ height: '70vh' }}>
        <h2 className="text-3xl font-bold mb-4">Item History</h2>
        
        <div className="relative mb-4">
            <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-highlighter text-pencil placeholder-pencil-light p-3 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-pencil-light">
                <SearchIcon className="w-5 h-5" />
            </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <SpinnerIcon className="w-8 h-8 text-pencil-light" />
            </div>
          ) : error ? (
            <p className="text-danger text-center">{error}</p>
          ) : filteredItems.length > 0 ? (
            <ul>
              {filteredItems.map(item => (
                <li key={item} className="flex items-center justify-between p-2 rounded-md group hover:bg-highlighter/50">
                  <span className="text-lg">{capitalize(item)}</span>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="p-2 opacity-0 group-hover:opacity-100 text-pencil-light hover:text-danger rounded-full hover:bg-danger/10 transition-opacity"
                    aria-label={`Delete ${item} from history`}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-pencil-light text-center py-8">
              {searchTerm ? 'No items match your search.' : 'Your item history is empty.'}
            </p>
          )}
        </div>
        
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-ink md:hover:bg-ink-light text-pencil font-bold rounded-md transition-colors">Done</button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;