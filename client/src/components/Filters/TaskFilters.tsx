import React from 'react';
import { Search, Filter, Calendar, Flag, Tag, X, Plus } from 'lucide-react';

interface TaskFilters {
  status: string;
  priority: string;
  search: string;
  tags: string;
  dateRange: {
    start: string;
    end: string;
  };
  assignedTo: string;
}

interface TaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  onCreateTask: () => void;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  activeFiltersCount,
  onCreateTask,
}) => {
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  const updateFilter = (key: keyof TaskFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const updateDateRange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value,
      },
    });
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">Manage all your tasks across projects</p>
        </div>
        <button
          onClick={onCreateTask}
          className="btn-primary btn-md mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
          placeholder="Search tasks by title, description, or tags..."
          className="input pl-10 w-full"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <select
            className="input w-40"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center space-x-2">
          <Flag className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Priority:</span>
          <select
            className="input w-40"
            value={filters.priority}
            onChange={(e) => updateFilter('priority', e.target.value)}
          >
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tags Filter */}
        <div className="flex items-center space-x-2">
          <Tag className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Tags:</span>
          <input
            type="text"
            placeholder="Filter by tags..."
            className="input w-40"
            value={filters.tags}
            onChange={(e) => updateFilter('tags', e.target.value)}
          />
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Due Date:</span>
          <input
            type="date"
            className="input w-36"
            value={filters.dateRange.start}
            onChange={(e) => updateDateRange('start', e.target.value)}
            placeholder="From"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            className="input w-36"
            value={filters.dateRange.end}
            onChange={(e) => updateDateRange('end', e.target.value)}
            placeholder="To"
          />
        </div>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Clear all ({activeFiltersCount})</span>
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Status: {statusOptions.find(opt => opt.value === filters.status)?.label}
              <button
                onClick={() => updateFilter('status', 'all')}
                className="ml-1 hover:text-blue-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filters.priority !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Priority: {priorityOptions.find(opt => opt.value === filters.priority)?.label}
              <button
                onClick={() => updateFilter('priority', 'all')}
                className="ml-1 hover:text-orange-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filters.tags && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Tags: {filters.tags}
              <button
                onClick={() => updateFilter('tags', '')}
                className="ml-1 hover:text-green-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {(filters.dateRange.start || filters.dateRange.end) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Date: {filters.dateRange.start || '...'} - {filters.dateRange.end || '...'}              <button
                onClick={() => {
                  updateDateRange('start', '');                  updateDateRange('end', '');
                }}
                className="ml-1 hover:text-purple-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default TaskFilters;
