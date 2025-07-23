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
import KanbanTaskCardCompact from './KanbanTaskCardCompact';
import { taskAPI } from '../../services/api';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>, skipSocketEmit?: boolean) => void;
  onAddTask: (status: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  columns?: Array<{ id: string; title: string; color: string }>;
  onManageColumns?: () => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  tasks, 
  onTaskUpdate, 
  onAddTask, 
  onEditTask, 
  onDeleteTask,
  columns: propColumns,
  onManageColumns
}) => {
 // console.log('🎯 KanbanBoard received tasks:', tasks.length, tasks.map(t => ({ title: t.title, status: t.status })));

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragStartStatus, setDragStartStatus] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false); // Prevent multiple simultaneous updates

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
    { id: 'todo', title: 'To Do', color: 'bg-slate-100' },
    { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'review', title: 'Review', color: 'bg-yellow-100' },
    { id: 'done', title: 'Done', color: 'bg-green-100' },
  ];

  const columns = propColumns || defaultColumns;  const getTasksByStatus = (status: string) => {
    const tasksForStatus = tasks.filter(task => {
      // Normalize both values to kebab-case for comparison
      const normalizedTaskStatus = normalizeStatus(task.status);
      const normalizedColumnStatus = normalizeStatus(status);
      const matches = normalizedTaskStatus === normalizedColumnStatus;
      
      // console.log('🔍 KanbanBoard filtering task for column:', {
      //   columnStatus: status,
      //   normalizedColumnStatus,
      //   taskTitle: task.title,
      //   taskStatus: task.status,
      //   normalizedTaskStatus,
      //   matches
      // });
      
      return matches;
    });
    
    //console.log(`📋 Column "${status}" has ${tasksForStatus.length} tasks`);
    return tasksForStatus;
  };const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t._id === active.id);
    if (task) {
      setActiveTask(task);
      setDragStartStatus(task.status); // Store the original status at drag start
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
  };  const handleDragEnd = (event: DragEndEvent) => {
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
      alert('Failed to save task position. Please try again.');
    } finally {      setTimeout(() => setIsUpdating(false), 500); // Prevent rapid successive calls
    }
  };
  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 pb-3 overflow-x-auto min-h-0">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={getTasksByStatus(column.id)}
              color={column.color}
              onAddTask={() => onAddTask(column.id)}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          ))}
          
          {/* Add Column Button */}
          {onManageColumns && (
            <div className="flex-shrink-0 w-72">
              <button
                onClick={onManageColumns}
                className="w-full h-full min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors duration-200 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <Plus className="w-8 h-8 mb-2" />
                <span className="font-medium">Add Column</span>
                <span className="text-sm text-gray-400">Create new stage</span>
              </button>
            </div>
          )}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 scale-105">
              <KanbanTaskCardCompact task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default KanbanBoard;
