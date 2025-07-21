import React, { useState } from 'react';
import { Search, Filter, Calendar, Flag, Tag, X, Plus, ChevronDown, SlidersHorizontal } from 'lucide-react';

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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const statusOptions = [
    { value: 'all', label: 'All Status', color: 'bg-gray-100 text-gray-700' },
    { value: 'todo', label: 'To Do', color: 'bg-blue-100 text-blue-700' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'review', label: 'Review', color: 'bg-purple-100 text-purple-700' },
    { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priority', color: 'bg-gray-100 text-gray-700' },
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
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
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Tasks
              </h1>
              <p className="text-gray-500 mt-2 text-lg">
                Manage all your tasks across projects
              </p>
            </div>
            <div className="flex items-center gap-3 mt-6 lg:mt-0">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-200 ${
                  showAdvancedFilters || activeFiltersCount > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={onCreateTask}
                className="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </button>
            </div>
          </div>

          {/* Search Bar - Always Visible */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tasks by title, description, or tags..."
              className="w-full pl-12 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          {/* Advanced Filters */}
          <div className={`transition-all duration-300 ease-in-out ${showAdvancedFilters ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
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
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Flag className="h-4 w-4 mr-2 text-gray-500" />
                    Priority
                  </label>
                  <select
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
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
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Tag className="h-4 w-4 mr-2 text-gray-500" />
                    Tags
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by tags..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    value={filters.tags}
                    onChange={(e) => updateFilter('tags', e.target.value)}
                  />
                </div>

                {/* Assigned To Filter */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <div className="h-4 w-4 mr-2 bg-gray-400 rounded-full"></div>
                    Assigned To
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by assignee..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    value={filters.assignedTo}
                    onChange={(e) => updateFilter('assignedTo', e.target.value)}
                  />
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="mt-6 space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  Due Date Range
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      value={filters.dateRange.start}
                      onChange={(e) => updateDateRange('start', e.target.value)}
                      placeholder="From"
                    />
                  </div>
                  <div className="flex items-center justify-center px-2">
                    <span className="text-gray-400 text-sm">to</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      value={filters.dateRange.end}
                      onChange={(e) => updateDateRange('end', e.target.value)}
                      placeholder="To"
                    />
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={onClearFilters}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-200"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear all filters ({activeFiltersCount})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.status !== 'all' && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  <Filter className="w-3 h-3 mr-1.5" />
                  {statusOptions.find(opt => opt.value === filters.status)?.label}
                  <button
                    onClick={() => updateFilter('status', 'all')}
                    className="ml-2 hover:text-blue-600 transition-colors duration-150"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {filters.priority !== 'all' && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
                  <Flag className="w-3 h-3 mr-1.5" />
                  {priorityOptions.find(opt => opt.value === filters.priority)?.label}
                  <button
                    onClick={() => updateFilter('priority', 'all')}
                    className="ml-2 hover:text-orange-600 transition-colors duration-150"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {filters.tags && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                  <Tag className="w-3 h-3 mr-1.5" />
                  {filters.tags}
                  <button
                    onClick={() => updateFilter('tags', '')}
                    className="ml-2 hover:text-green-600 transition-colors duration-150"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.assignedTo && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  <div className="w-3 h-3 mr-1.5 bg-purple-600 rounded-full"></div>
                  {filters.assignedTo}
                  <button
                    onClick={() => updateFilter('assignedTo', '')}
                    className="ml-2 hover:text-purple-600 transition-colors duration-150"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {(filters.dateRange.start || filters.dateRange.end) && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                  <Calendar className="w-3 h-3 mr-1.5" />
                  {filters.dateRange.start || '...'} - {filters.dateRange.end || '...'}
                  <button
                    onClick={() => {
                      updateDateRange('start', '');
                      updateDateRange('end', '');
                    }}
                    className="ml-2 hover:text-indigo-600 transition-colors duration-150"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskFilters;