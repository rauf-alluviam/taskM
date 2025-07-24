import React, { useState } from 'react';
import { Search, Filter, Calendar, Flag, Tag, X, Plus, ChevronDown, SlidersHorizontal, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === 'dark';
  
  const statusOptions = [
    { value: 'all', label: 'All Status', color: darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700' },
    { value: 'todo', label: 'To Do', color: darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700' },
    { value: 'in-progress', label: 'In Progress', color: darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700' },
    { value: 'review', label: 'Review', color: darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700' },
    { value: 'done', label: 'Done', color: darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priority', color: darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700' },
    { value: 'low', label: 'Low', color: darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700' },
    { value: 'medium', label: 'Medium', color: darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700' },
    { value: 'high', label: 'High', color: darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700' },
    { value: 'critical', label: 'Critical', color: darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700' },
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
    <div className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="flex-1">
              <h1 className={`text-3xl font-bold bg-gradient-to-r ${darkMode ? 'from-gray-100 to-gray-400' : 'from-gray-900 to-gray-600'} bg-clip-text text-transparent`}>
                Tasks
              </h1>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2 text-lg transition-colors duration-300`}>
                Manage all your tasks across projects
              </p>
            </div>
            <div className="flex items-center gap-3 mt-6 lg:mt-0">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className={`inline-flex items-center p-2.5 text-sm font-medium rounded-xl border transition-all duration-200 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-200 ${
                  showAdvancedFilters || activeFiltersCount > 0
                    ? darkMode 
                      ? 'bg-blue-900 border-blue-700 text-blue-300 hover:bg-blue-800'
                      : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                    : darkMode
                      ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white ${darkMode ? 'bg-blue-500' : 'bg-blue-600'} rounded-full`}>
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={onCreateTask}
                className={`inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white ${
                  darkMode 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                } rounded-xl transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl`}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </button>
            </div>
          </div>

          {/* Search Bar - Always Visible */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              placeholder="Search tasks by title, description, or tags..."
              className={`w-full pl-12 pr-4 py-3 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                darkMode 
                  ? 'border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-500 focus:bg-gray-700'
                  : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-500 focus:bg-white'
              }`}
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          {/* Advanced Filters */}
          <div className={`transition-all duration-300 ease-in-out ${showAdvancedFilters ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-2xl p-6 mb-6 transition-colors duration-300`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className={`flex items-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Filter className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    Status
                  </label>
                  <select
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-gray-200'
                        : 'border-gray-200 bg-white text-gray-900'
                    }`}
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
                  <label className={`flex items-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Flag className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    Priority
                  </label>
                  <select
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-gray-200'
                        : 'border-gray-200 bg-white text-gray-900'
                    }`}
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
                  <label className={`flex items-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Tag className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    Tags
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by tags..."
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-500'
                        : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                    value={filters.tags}
                    onChange={(e) => updateFilter('tags', e.target.value)}
                  />
                </div>

                {/* Assigned To Filter */}
                <div className="space-y-2">
                  <label className={`flex items-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className={`h-4 w-4 mr-2 ${darkMode ? 'bg-gray-500' : 'bg-gray-400'} rounded-full`}></div>
                    Assigned To
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by assignee..."
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-500'
                        : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                    value={filters.assignedTo}
                    onChange={(e) => updateFilter('assignedTo', e.target.value)}
                  />
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="mt-6 space-y-2">
                <label className={`flex items-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Calendar className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  Due Date Range
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="date"
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-700 text-gray-200'
                          : 'border-gray-200 bg-white text-gray-900'
                      }`}
                      value={filters.dateRange.start}
                      onChange={(e) => updateDateRange('start', e.target.value)}
                      placeholder="From"
                    />
                  </div>
                  <div className="flex items-center justify-center px-2">
                    <span className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} text-sm`}>to</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="date"
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-700 text-gray-200'
                          : 'border-gray-200 bg-white text-gray-900'
                      }`}
                      value={filters.dateRange.end}
                      onChange={(e) => updateDateRange('end', e.target.value)}
                      placeholder="To"
                    />
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <div className={`mt-6 pt-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <button
                    onClick={onClearFilters}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      darkMode
                        ? 'text-red-300 bg-red-900 hover:bg-red-800'
                        : 'text-red-700 bg-red-50 hover:bg-red-100'
                    }`}
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
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
                  darkMode 
                    ? 'bg-blue-900 text-blue-300 border-blue-700'
                    : 'bg-blue-100 text-blue-800 border-blue-200'
                }`}>
                  <Filter className="w-3 h-3 mr-1.5" />
                  {statusOptions.find(opt => opt.value === filters.status)?.label}
                  <button
                    onClick={() => updateFilter('status', 'all')}
                    className={`ml-2 transition-colors duration-150 ${
                      darkMode ? 'hover:text-blue-200' : 'hover:text-blue-600'
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {filters.priority !== 'all' && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
                  darkMode 
                    ? 'bg-orange-900 text-orange-300 border-orange-700'
                    : 'bg-orange-100 text-orange-800 border-orange-200'
                }`}>
                  <Flag className="w-3 h-3 mr-1.5" />
                  {priorityOptions.find(opt => opt.value === filters.priority)?.label}
                  <button
                    onClick={() => updateFilter('priority', 'all')}
                    className={`ml-2 transition-colors duration-150 ${
                      darkMode ? 'hover:text-orange-200' : 'hover:text-orange-600'
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {filters.tags && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
                  darkMode 
                    ? 'bg-green-900 text-green-300 border-green-700'
                    : 'bg-green-100 text-green-800 border-green-200'
                }`}>
                  <Tag className="w-3 h-3 mr-1.5" />
                  {filters.tags}
                  <button
                    onClick={() => updateFilter('tags', '')}
                    className={`ml-2 transition-colors duration-150 ${
                      darkMode ? 'hover:text-green-200' : 'hover:text-green-600'
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.assignedTo && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
                  darkMode 
                    ? 'bg-purple-900 text-purple-300 border-purple-700'
                    : 'bg-purple-100 text-purple-800 border-purple-200'
                }`}>
                  <div className={`w-3 h-3 mr-1.5 ${darkMode ? 'bg-purple-400' : 'bg-purple-600'} rounded-full`}></div>
                  {filters.assignedTo}
                  <button
                    onClick={() => updateFilter('assignedTo', '')}
                    className={`ml-2 transition-colors duration-150 ${
                      darkMode ? 'hover:text-purple-200' : 'hover:text-purple-600'
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {(filters.dateRange.start || filters.dateRange.end) && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
                  darkMode 
                    ? 'bg-indigo-900 text-indigo-300 border-indigo-700'
                    : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                }`}>
                  <Calendar className="w-3 h-3 mr-1.5" />
                  {filters.dateRange.start || '...'} - {filters.dateRange.end || '...'}
                  <button
                    onClick={() => {
                      updateDateRange('start', '');
                      updateDateRange('end', '');
                    }}
                    className={`ml-2 transition-colors duration-150 ${
                      darkMode ? 'hover:text-indigo-200' : 'hover:text-indigo-600'
                    }`}
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