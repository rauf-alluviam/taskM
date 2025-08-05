import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Task } from '../../contexts/TaskContext';
import { normalizeStatus, statusToDisplayName } from '../../utils/statusMappings';
import KanbanColumn from './KanbanColumn';
import KanbanTaskCard from './KanbanTaskCard'
import { taskAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>, skipSocketEmit?: boolean) => void;
  onAddTask: (status: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onDeleteColumn?: (columnId: string) => void;
  onEditColumn?: (columnId: string, updates: { title?: string; color?: string }) => Promise<void>;
  columns?: Array<{ id: string; title: string; color: string }>;
  onManageColumns?: () => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  tasks, 
  onTaskUpdate, 
  onAddTask, 
  onEditTask, 
  onDeleteTask,
  onDeleteColumn,
  onEditColumn,
  columns: propColumns,
  onManageColumns
}) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragStartStatus, setDragStartStatus] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { addNotification } = useNotification();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const defaultColumns = [
    { id: 'todo', title: 'To Do', color: 'border-slate-200' },
    { id: 'in-progress', title: 'In Progress', color: 'border-blue-200' },
    { id: 'review', title: 'Review', color: 'border-yellow-200' },
    { id: 'done', title: 'Done', color: 'border-green-200' },
  ];

  const columns = propColumns || defaultColumns;

  // Debug: Log all columns being rendered
  console.log('📋 KanbanBoard: All columns being rendered:', columns.map(col => ({
    id: col.id,
    title: col.title,
    isDefault: ['todo', 'in-progress', 'review', 'done'].includes(col.id)
  })));

  const getTasksByStatus = (status: string) => {
    const tasksForStatus = tasks.filter(task => {
      // Normalize both values to kebab-case for comparison
      const normalizedTaskStatus = normalizeStatus(task.status);
      const normalizedColumnStatus = normalizeStatus(status);
      const matches = normalizedTaskStatus === normalizedColumnStatus;
      
      return matches;
    });
    
    return tasksForStatus;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t._id === active.id);
    if (task) {
      setActiveTask(task);
      setDragStartStatus(task.status);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Find the task being dragged
    const activeTask = tasks.find(t => t._id === activeId);
    if (!activeTask) return;

    // Check if we're hovering over a column or another task
    const overTask = tasks.find(t => t._id === overId);
    const overColumn = columns.find(c => c.id === overId);

    let newStatus = activeTask.status;

    if (overColumn) {
      // Hovering over a column
      newStatus = overColumn.id;
    } else if (overTask) {
      // Hovering over another task - use that task's status
      newStatus = overTask.status;
    }

    // Only update if status would change
    if (activeTask.status !== newStatus) {
      // Update immediately for responsive UI
      onTaskUpdate(activeTask._id, { status: newStatus });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset drag state
    setActiveTask(null);
    const originalStatusBackup = dragStartStatus;
    setDragStartStatus(null);
    
    if (!over) {
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropping on a column directly
    let targetColumn = columns.find(c => c.id === overId);
    let newStatus = overId;
      if (!targetColumn) {
      // Not dropping on a column, maybe dropping on another task
      // Find the task that was dropped on
      const targetTask = tasks.find(t => t._id === overId);
      if (targetTask) {
        // Get the column of the target task
        newStatus = targetTask.status;
        targetColumn = columns.find(c => c.id === targetTask.status);
      }
    }
      if (!targetColumn) {
      return;
    }

    // Get original status from when drag started
    const originalStatus = originalStatusBackup;

    // Only call API if status actually changed
    if (originalStatus && originalStatus !== newStatus) {
      updateTaskStatus(taskId, newStatus);
    }
  };const updateTaskStatus = async (taskId: string, newStatus: string) => {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    
    try {
      // Use the EXACT SAME API call that works for task editing
      const response = await taskAPI.updateTask(taskId, { status: newStatus });
      
      // Update local state after successful API call - SKIP socket emit to prevent loops
      onTaskUpdate(taskId, { status: newStatus }, true);
      
    } catch (error) {
      //console.error('Failed to update task status:', error);
      if (error.response?.status === 429) {
        setTimeout(() => {
          setIsUpdating(false);
          updateTaskStatus(taskId, newStatus);
        }, 1000);
        return;
      }
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'You do not have permission to update other tasks.',
        duration: 5000,
      });
    } finally {      setTimeout(() => setIsUpdating(false), 500); // Prevent rapid successive calls
    }
  };
  return (
    <div className="h-full relative z-10">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Scroll container with indicators */}
        <div className="relative h-full">
          {/* Left scroll indicator */}
          {columns.length > 3 && (
            <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-white via-white to-transparent dark:from-slate-800 dark:via-slate-800 pointer-events-none z-10 flex items-center justify-start pl-2">
              <div className="w-1 h-8 bg-gray-400 dark:bg-slate-500 rounded-full opacity-70"></div>
            </div>
          )}
          
          {/* Right scroll indicator */}
          {columns.length > 3 && (
            <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-white via-white to-transparent dark:from-slate-800 dark:via-slate-800 pointer-events-none z-10 flex items-center justify-end pr-2">
              <div className="w-1 h-8 bg-gray-400 dark:bg-slate-500 rounded-full opacity-70"></div>
            </div>
          )}

          <div className="flex gap-3 pb-4 pr-6 overflow-x-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-800 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-slate-500">
            {columns.map((column) => (
              <div key={column.id} className="flex-shrink-0">
                <KanbanColumn
                  id={column.id}
                  title={column.title}
                  tasks={getTasksByStatus(column.id)}
                  color={column.color}
                  onAddTask={() => onAddTask(column.id)}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onRemoveColumn={onDeleteColumn}
                  onEditColumn={(() => {
                    console.log(`🔗 KanbanBoard: Passing onEditColumn to column "${column.title}" (${column.id}):`, {
                      onEditColumn: !!onEditColumn,
                      onEditColumnType: typeof onEditColumn,
                      functionLength: onEditColumn?.toString?.().length || 0,
                      columnIsCustom: !['todo', 'in-progress', 'review', 'done'].includes(column.id)
                    });
                    return onEditColumn;
                  })()}
                />
              </div>
            ))}
            
            {/* Add Column Button */}
            {onManageColumns && (
              <div className="flex-shrink-0 w-72">
                <button
                  onClick={onManageColumns}
                  className="w-full h-full min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors duration-200 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  <Plus className="w-8 h-8 mb-2" />
                  <span className="font-medium">Add Column</span>
                  <span className="text-sm text-gray-400 dark:text-slate-500">Create new stage</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
      </DndContext>
    </div>
  );
};

export default KanbanBoard;
