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
    'todo': 'bg-slate-100 border-slate-300',
    'in-progress': 'bg-blue-100 border-blue-300',
    'review': 'bg-yellow-100 border-yellow-300',
    'done': 'bg-green-100 border-green-300',
    'blocked': 'bg-red-100 border-red-300'
  };

  const headerColors = {
    'todo': 'text-slate-700',
    'in-progress': 'text-blue-700',
    'review': 'text-yellow-700',
    'done': 'text-green-700',
    'blocked': 'text-red-700'
  };

  const getColumnColor = () => columnColors[id as keyof typeof columnColors] || 'bg-gray-100 border-gray-300';
  const getHeaderColor = () => headerColors[id as keyof typeof headerColors] || 'text-gray-700';
  return (
    <div className={`w-72 rounded-lg border-2 transition-colors ${getColumnColor()} ${isOver ? 'border-blue-400 bg-blue-50' : ''}`}>
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className={`font-semibold text-sm ${getHeaderColor()}`}>
              {title}
            </h3>
            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-600 bg-white rounded-full border border-gray-300">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={onAddTask}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Container */}
      <div
        ref={setNodeRef}
        className="p-4 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin"
      >        <SortableContext items={tasks.map(task => task._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanTaskCardCompact 
              key={task._id} 
              task={task} 
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-2">
              <Plus className="w-4 h-4" />
            </div>
            <p className="text-sm">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
