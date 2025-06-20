import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, Users, FolderOpen, Plus } from 'lucide-react';
import { Project } from '../../contexts/TaskContext';

export interface ProjectFilters {
  search: string;
  department: string;
  dateRange: {
    start: string;
    end: string;
  };
  sortBy: 'name' | 'createdAt' | 'department';
  sortOrder: 'asc' | 'desc';
}

interface ProjectFiltersProps {
  projects: Project[];
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  onFilteredProjectsChange: (projects: Project[]) => void;
  onCreateProject: () => void;
}

const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  projects,
  filters,
  onFiltersChange,
  onFilteredProjectsChange,
  onCreateProject,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Get unique departments from projects
  const departments = [...new Set(projects.map(p => p.department))].filter(Boolean);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...projects];

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm) ||
        project.description.toLowerCase().includes(searchTerm) ||
        project.department.toLowerCase().includes(searchTerm)
      );
    }

    // Apply department filter
    if (filters.department) {
      filtered = filtered.filter(project => project.department === filters.department);
    }

    // Apply date range filter
    if (filters.dateRange.start) {
      const startDate = new Date(filters.dateRange.start);
      filtered = filtered.filter(project => new Date(project.createdAt) >= startDate);
    }
    if (filters.dateRange.end) {
      const endDate = new Date(filters.dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      filtered = filtered.filter(project => new Date(project.createdAt) <= endDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'department':
          aValue = a.department.toLowerCase();
          bValue = b.department.toLowerCase();
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    onFilteredProjectsChange(filtered);
  }, [projects, filters, onFilteredProjectsChange]);

  const updateFilters = (updates: Partial<ProjectFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      department: '',
      dateRange: { start: '', end: '' },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setShowAdvancedFilters(false);
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.department ||
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.sortBy !== 'createdAt' ||
    filters.sortOrder !== 'desc'
  );
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage and organize your projects</p>
        </div>
        <button
          onClick={onCreateProject}
          className="btn-primary btn-md mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Main Search and Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="input pl-10 w-full"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`btn-outline btn-md flex items-center ${
                hasActiveFilters ? 'border-primary-300 text-primary-700 bg-primary-50' : ''
              }`}
            >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary-200 text-primary-800 rounded-full">
                {[
                  filters.search && 'search',
                  filters.department && 'dept',
                  filters.dateRange.start && 'date',
                  filters.sortBy !== 'createdAt' && 'sort',
                ].filter(Boolean).length}
              </span>
            )}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="btn-outline btn-md flex items-center text-gray-600 hover:text-gray-800"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) => updateFilters({ department: e.target.value })}
                className="input w-full"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Created From
              </label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => updateFilters({ 
                  dateRange: { ...filters.dateRange, start: e.target.value }
                })}
                className="input w-full"
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Created Until
              </label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => updateFilters({ 
                  dateRange: { ...filters.dateRange, end: e.target.value }
                })}
                className="input w-full"
              />
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FolderOpen className="w-4 h-4 inline mr-1" />
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilters({ sortBy: e.target.value as ProjectFilters['sortBy'] })}
                  className="input flex-1"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="name">Name</option>
                  <option value="department">Department</option>
                </select>
                <button
                  onClick={() => updateFilters({ 
                    sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                  })}
                  className="btn-outline btn-md px-3"
                  title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {filters.sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {filters.search && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    Search: "{filters.search}"
                    <button
                      onClick={() => updateFilters({ search: '' })}
                      className="ml-1 text-primary-600 hover:text-primary-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.department && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                    Dept: {filters.department}
                    <button
                      onClick={() => updateFilters({ department: '' })}
                      className="ml-1 text-secondary-600 hover:text-secondary-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.dateRange.start && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    From: {new Date(filters.dateRange.start).toLocaleDateString()}
                    <button
                      onClick={() => updateFilters({ 
                        dateRange: { ...filters.dateRange, start: '' }
                      })}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.dateRange.end && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Until: {new Date(filters.dateRange.end).toLocaleDateString()}
                    <button
                      onClick={() => updateFilters({ 
                        dateRange: { ...filters.dateRange, end: '' }
                      })}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default ProjectFilters;
