import React, { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Trash2, Edit2, Check, X } from 'lucide-react';
import { Task } from '../../contexts/TaskContext';
import KanbanTaskCard from './KanbanTaskCard';

interface DeleteConfirmation {
  isOpen: boolean;
  columnId: string;
  columnTitle: string;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
  onAddTask: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onRemoveColumn?: (columnId: string) => void;
  onEditColumn?: (columnId: string, updates: { title?: string; color?: string }) => Promise<void>;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  id, 
  title, 
  tasks, 
  color = 'bg-gray-100',
  onAddTask,
  onEditTask,
  onDeleteTask,
  onRemoveColumn,
  onEditColumn
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    columnId: '',
    columnTitle: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync editTitle with title prop when it changes (e.g., from Socket.IO updates)
  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  const columnColors = {
    'todo': 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
    'in-progress': 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
    'review': 'bg-yellow-100 dark:bg-amber-800 border-yellow-300 dark:border-amber-600',
    'done': 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
    'blocked': 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700'
  };

  const headerColors = {
    'todo': 'text-slate-700 dark:text-slate-200',
    'in-progress': 'text-blue-700 dark:text-blue-200',
    'review': 'text-yellow-700 dark:text-amber-200',
    'done': 'text-green-700 dark:text-green-200',
    'blocked': 'text-red-700 dark:text-red-200'
  };

  const getColumnColor = () => {
    // First use the color prop if it exists
    if (color) {
      // If color is just the background class, add a matching border
      if (color.startsWith('bg-')) {
        // Map light color to dark variant with improved contrast
        const colorMap: Record<string, string> = {
          'bg-slate-100': 'dark:bg-slate-800',
          'bg-blue-100': 'dark:bg-blue-900',
          'bg-yellow-100': 'dark:bg-amber-800',
          'bg-green-100': 'dark:bg-green-900',
          'bg-red-100': 'dark:bg-red-900',
          'bg-gray-100': 'dark:bg-slate-800',
          'bg-purple-100': 'dark:bg-purple-900',
          'bg-pink-100': 'dark:bg-pink-900',
          'bg-indigo-100': 'dark:bg-indigo-900',
        };
        const borderMap: Record<string, string> = {
          'bg-slate-100': 'border-slate-300 dark:border-slate-600',
          'bg-blue-100': 'border-blue-300 dark:border-blue-700',
          'bg-yellow-100': 'border-yellow-300 dark:border-amber-600',
          'bg-green-100': 'border-green-300 dark:border-green-700',
          'bg-red-100': 'border-red-300 dark:border-red-700',
          'bg-gray-100': 'border-gray-300 dark:border-slate-600',
          'bg-purple-100': 'border-purple-300 dark:border-purple-700',
          'bg-pink-100': 'border-pink-300 dark:border-pink-700',
          'bg-indigo-100': 'border-indigo-300 dark:border-indigo-700',
        };
        return `${color} ${colorMap[color] || ''} ${borderMap[color] || ''}`;
      }
      return color;
    }
    // Fall back to column ID mapping for legacy support
    return columnColors[id as keyof typeof columnColors] || 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600';
  };

  const getHeaderColor = () => headerColors[id as keyof typeof headerColors] || 'text-gray-700 dark:text-slate-200';

  // Check if this column can be deleted (default columns cannot be deleted)
  const defaultColumns = ['todo', 'in-progress', 'review', 'done'];
  const canDeleteColumn = onRemoveColumn && !defaultColumns.includes(id);
  const canEditColumn = onEditColumn && !defaultColumns.includes(id);

  // Enhanced debug logging to troubleshoot missing edit buttons
  console.log(`🔍 Column "${title}" (id: "${id}"):`, {
    onEditColumn: !!onEditColumn,
    onEditColumnType: typeof onEditColumn,
    isDefault: defaultColumns.includes(id),
    canEditColumn,
    canDeleteColumn,
    hasEditButton: canEditColumn ? 'YES' : 'NO'
  });

  // Force show edit for custom columns if onEditColumn exists but canEditColumn is false
  const isCustomColumn = !defaultColumns.includes(id);
  const shouldForceEdit = isCustomColumn; // Temporarily force show for ALL custom columns
  
  if (shouldForceEdit) {
    console.log(`✅ Force enabling edit for custom column "${title}" because it's a custom column`);
  }

  const handleDeleteClick = (column: { id: string; title: string }) => {
    setDeleteConfirmation({
      isOpen: true,
      columnId: column.id,
      columnTitle: column.title
    });
  };
  
  const confirmDelete = () => {
    if (onRemoveColumn) {
      onRemoveColumn(deleteConfirmation.columnId);
    }
    setDeleteConfirmation({
      isOpen: false,
      columnId: '',
      columnTitle: ''
    });
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditTitle(title);
  };

  const handleSaveEdit = async () => {
    if (editTitle.trim() === title || !editTitle.trim()) {
      setIsEditing(false);
      setEditTitle(title);
      return;
    }

    const newTitle = editTitle.trim();
    
    try {
      setIsUpdating(true);
      console.log(`💾 Attempting to save column edit for "${title}" (${id}) with new title: "${newTitle}"`);
      
      // If onEditColumn is not available, call the API directly
      if (onEditColumn && typeof onEditColumn === 'function') {
        await onEditColumn(id, { title: newTitle });
        console.log(`✅ Successfully saved column edit for "${title}" via prop function`);
      } else {
        // Fallback: call API directly
        console.log('⚠️ onEditColumn not available, calling API directly');
        const { kanbanAPI } = await import('../../services/api');
        
        // Try to get projectId from URL or other sources
        const currentPath = window.location.pathname;
        const projectIdMatch = currentPath.match(/\/projects\/([^\/]+)/);
        const projectId = projectIdMatch ? projectIdMatch[1] : undefined;
        
        console.log(`🔧 Using projectId: ${projectId || 'none'}`);
        await kanbanAPI.updateColumn(id, { title: newTitle }, projectId);
        console.log(`✅ Successfully saved column edit for "${title}" via direct API call`);
      }
      
      setIsEditing(false);
      // Note: The title prop will be updated when the parent component re-renders
      // with fresh data from the server or Socket.IO events
      
    } catch (error) {
      console.error('❌ Failed to update column:', error);
      setEditTitle(title); // Reset to original title on error
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(title);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className={`w-72 flex-shrink-0 rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md ${getColumnColor()} ${
      isOver 
        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30 shadow-lg scale-[1.02]' 
        : ''
    }`}>
      {/* Enhanced Column Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className={`font-semibold text-sm ${getHeaderColor()}`}>
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="bg-transparent border-b border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-0 text-sm font-semibold placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="Column title"
                />
              ) : (
                title
              )}
            </h3>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 rounded-full border border-gray-300 dark:border-slate-500 shadow-sm">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={onAddTask}
              className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 hover:scale-110"
              title="Add task"
            >
              <Plus className="w-4 h-4" />
            </button>
            
            {canDeleteColumn && (
              <button
               onClick={() => handleDeleteClick({ id, title })}
                className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-all duration-200 hover:scale-110"
                title="Delete column"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {/* Edit button - show for custom columns */}
            {(canEditColumn || shouldForceEdit) && (
              <>
                <button
                  onClick={handleEditClick}
                  className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/50 rounded-lg transition-all duration-200 hover:scale-110"
                  title="Edit column name"
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </button>
                {isEditing && (
                  <button
                    onClick={handleSaveEdit}
                    className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-all duration-200 hover:scale-110"
                    title="Save column name changes"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Tasks Container */}
      <div
        ref={setNodeRef}
        className="p-3 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-b-xl"
      >
        <SortableContext items={tasks.map(task => task._id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <KanbanTaskCard
                key={task._id} 
                task={task} 
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-slate-500">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center mb-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium">Drop tasks here</p>
            <p className="text-xs mt-1 text-gray-300 dark:text-slate-600">or click + to add</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center border border-red-200 dark:border-red-800">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Delete Column</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Are you sure you want to delete "{deleteConfirmation.columnTitle}"?
                </p>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200 flex items-start">
                <Trash2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                This action cannot be undone. All tasks in this column should be moved to another column before deleting.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
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
        </div>
      )}
    </div>
  );
};

export default KanbanColumn;