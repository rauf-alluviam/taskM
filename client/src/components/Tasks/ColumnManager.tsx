import React, { useState } from 'react';
import { X, Plus, Check, AlertTriangle, Trash2 } from 'lucide-react';
import Modal from '../UI/Modal';

interface ColumnManagerProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Array<{ id: string; title: string; color: string }>;
  onAddColumn: (column: { id: string; title: string; color: string }) => void;
  onRemoveColumn: (columnId: string) => void;
}

interface DeleteConfirmation {
  isOpen: boolean;
  columnId: string;
  columnTitle: string;
}

const ColumnManager: React.FC<ColumnManagerProps> = ({
  isOpen,
  onClose,
  columns,
  onAddColumn,
  onRemoveColumn,
}) => {
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState('bg-gray-100');
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    columnId: '',
    columnTitle: ''
  });

  const colorOptions = [
    { value: 'bg-gray-100', label: 'Gray', preview: 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600' },
    { value: 'bg-blue-100', label: 'Blue', preview: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700' },
    { value: 'bg-green-100', label: 'Green', preview: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700' },
    { value: 'bg-yellow-100', label: 'Yellow', preview: 'bg-yellow-100 dark:bg-amber-800 border-yellow-300 dark:border-amber-600' },
    { value: 'bg-purple-100', label: 'Purple', preview: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700' },
    { value: 'bg-pink-100', label: 'Pink', preview: 'bg-pink-100 dark:bg-pink-900 border-pink-300 dark:border-pink-700' },
    { value: 'bg-indigo-100', label: 'Indigo', preview: 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700' },
    { value: 'bg-red-100', label: 'Red', preview: 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700' },
  ];

  const defaultColumns = ['todo', 'in-progress', 'review', 'done'];

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return;

    const columnId = newColumnTitle.toLowerCase().replace(/\s+/g, '-');
    
    onAddColumn({
      id: columnId,
      title: newColumnTitle.trim(),
      color: selectedColor,
    });

    setNewColumnTitle('');
    setSelectedColor('bg-gray-100');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddColumn();
    }
  };

  const canRemoveColumn = (columnId: string) => {
    return !defaultColumns.includes(columnId);
  };
  
  const handleDeleteClick = (column: { id: string; title: string }) => {
    setDeleteConfirmation({
      isOpen: true,
      columnId: column.id,
      columnTitle: column.title
    });
  };
  
  const confirmDelete = () => {
    onRemoveColumn(deleteConfirmation.columnId);
    setDeleteConfirmation({
      isOpen: false,
      columnId: '',
      columnTitle: ''
    });
  };

  return (
    <>
      {/* Main Column Manager Modal */}
     <Modal isOpen={isOpen} onClose={onClose} title="Manage Kanban Columns">
      {/* <Modal isOpen={isOpen} onClose={onClose} title="Manage Kanban Columns" className="dark:bg-slate-900"></Modal> */}
        <div className="space-y-6 ">
          {/* Header Description */}
          <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Customize your workflow:</strong> Add new stages to match your team's process. 
              Default columns (To Do, In Progress, Review, Done) cannot be removed.
            </p>
          </div>
          
          {/* Current Columns */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-3">Current Columns</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800/50 backdrop-blur-sm hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded ${column.color.replace('bg-', 'bg-')} border border-gray-300 dark:border-slate-500`} />
                    <span className="font-medium text-gray-900 dark:text-slate-100">{column.title}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                      {column.id}
                    </span>
                  </div>
                  
                  {canRemoveColumn(column.id) ? (
                    <button
                      onClick={() => handleDeleteClick({ id: column.id, title: column.title })}
                      className="p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors"
                      title="Delete column"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md font-medium">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add New Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-3 flex items-center">
              <Plus className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Add New Column
            </h3>
            
            <div className="space-y-4">
              {/* Column Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Column Name *
                </label>
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="e.g., Testing, Blocked, Deployed, QA..."
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
                  Column Color
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedColor(option.value)}
                      className={`
                        flex items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105
                        ${option.preview}
                        ${selectedColor === option.value 
                          ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 dark:ring-offset-slate-900 shadow-lg' 
                          : 'hover:border-gray-400 dark:hover:border-slate-500'
                        }
                      `}
                    >
                      {selectedColor === option.value && (
                        <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 drop-shadow-sm" />
                      )}
                      <span className="sr-only">{option.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400 mt-2 flex items-center">
                  <div className={`w-3 h-3 rounded mr-2 ${selectedColor} border border-gray-300 dark:border-slate-500`} />
                  Selected: {colorOptions.find(c => c.value === selectedColor)?.label}
                </p>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddColumn}
                disabled={!newColumnTitle.trim()}
                className="w-full px-4 py-2.5 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white dark:text-slate-100 font-medium rounded-lg transition-colors duration-200 flex items-center justify-center shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-600">
            <button 
              onClick={onClose} 
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 font-medium rounded-lg transition-colors duration-200"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal - Separate from main modal */}
      {deleteConfirmation.isOpen && (
        <Modal
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ isOpen: false, columnId: '', columnTitle: '' })}
          title="Delete Column"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Delete Column</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Are you sure you want to delete "{deleteConfirmation.columnTitle}"?
                </p>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200 flex items-start">
                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                This action cannot be undone. All tasks in this column should be moved to another column before deleting.
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setDeleteConfirmation({ isOpen: false, columnId: '', columnTitle: '' })}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 font-medium rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white dark:text-slate-100 font-medium rounded-lg transition-colors duration-200 shadow-sm"
              >
                Delete Column
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ColumnManager;