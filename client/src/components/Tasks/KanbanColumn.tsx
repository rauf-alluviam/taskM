import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Task } from '../../contexts/TaskContext';
import KanbanTaskCardCompact from './KanbanTaskCardCompact';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
  onAddTask: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  id, 
  title, 
  tasks, 
  color = 'bg-gray-100',
  onAddTask,
  onEditTask,
  onDeleteTask 
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

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
  
  return (
    <div className={`w-72 rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md ${getColumnColor()} ${
      isOver 
        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30 shadow-lg scale-[1.02]' 
        : ''
    }`}>
      {/* Enhanced Column Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className={`font-semibold text-sm ${getHeaderColor()}`}>{title}</h3>
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
            <button 
              className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 hover:scale-110"
              title="Column options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
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
              <KanbanTaskCardCompact 
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
    </div>
  );
};

export default KanbanColumn;  