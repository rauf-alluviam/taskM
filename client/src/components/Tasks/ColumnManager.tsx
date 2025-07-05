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
    { value: 'bg-gray-100', label: 'Gray', preview: 'bg-gray-100 border-gray-300' },
    { value: 'bg-blue-100', label: 'Blue', preview: 'bg-blue-100 border-blue-300' },
    { value: 'bg-green-100', label: 'Green', preview: 'bg-green-100 border-green-300' },
    { value: 'bg-yellow-100', label: 'Yellow', preview: 'bg-yellow-100 border-yellow-300' },
    { value: 'bg-purple-100', label: 'Purple', preview: 'bg-purple-100 border-purple-300' },
    { value: 'bg-pink-100', label: 'Pink', preview: 'bg-pink-100 border-pink-300' },
    { value: 'bg-indigo-100', label: 'Indigo', preview: 'bg-indigo-100 border-indigo-300' },
    { value: 'bg-red-100', label: 'Red', preview: 'bg-red-100 border-red-300' },
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
        <div className="space-y-6">
          {/* Header Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-700">
              <strong>Customize your workflow:</strong> Add new stages to match your team's process. 
              Default columns (To Do, In Progress, Review, Done) cannot be removed.
            </p>
          </div>
          
          {/* Current Columns */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Columns</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded ${column.color.replace('bg-', 'bg-')} border`} />
                    <span className="font-medium text-gray-900">{column.title}</span>
                    <span className="text-xs text-gray-500">({column.id})</span>
                  </div>
                  
                  {canRemoveColumn(column.id) ? (
                    <button
                      onClick={() => handleDeleteClick({ id: column.id, title: column.title })}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete column"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add New Column */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              <Plus className="w-4 h-4 inline mr-2" />
              Add New Column
            </h3>
            
            <div className="space-y-4">
              {/* Column Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Column Name *
                </label>
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="input w-full"
                  placeholder="e.g., Testing, Blocked, Deployed, QA..."
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Column Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedColor(option.value)}
                      className={`
                        flex items-center justify-center p-3 rounded-md border-2 transition-colors
                        ${option.preview}
                        ${selectedColor === option.value ? 'ring-2 ring-blue-500' : ''}
                      `}
                    >
                      {selectedColor === option.value && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="sr-only">{option.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {colorOptions.find(c => c.value === selectedColor)?.label}
                </p>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddColumn}
                disabled={!newColumnTitle.trim()}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button onClick={onClose} className="btn-outline">
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
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Column</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete "{deleteConfirmation.columnTitle}"?
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                ⚠️ This action cannot be undone. All tasks in this column should be moved to another column before deleting.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setDeleteConfirmation({ isOpen: false, columnId: '', columnTitle: '' })}
                className="btn-outline btn-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn-danger btn-md"
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
