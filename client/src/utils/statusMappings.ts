// Status mapping utilities for Kanban board
// All statuses should be in kebab-case format (todo, in-progress, review, done)
export const statusMappings = {
  // Map old display name formats to kebab-case IDs
  'To Do': 'todo',
  'In Progress': 'in-progress', 
  'Review': 'review',
  'Done': 'done',
  // Keep kebab-case formats as-is
  'todo': 'todo',
  'in-progress': 'in-progress',
  'review': 'review',
  'done': 'done'
};

// Reverse mapping - column IDs to display names (for UI display only)
export const columnToDisplayName = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'review': 'Review', 
  'done': 'Done'
};

// Normalize status from any format to kebab-case column ID
export const normalizeStatus = (status: string): string => {
  return statusMappings[status as keyof typeof statusMappings] || status.toLowerCase().replace(/\s+/g, '-');
};

// Convert kebab-case column ID to display name for UI only
export const statusToDisplayName = (columnId: string): string => {
  return columnToDisplayName[columnId as keyof typeof columnToDisplayName] || columnId;
};

// Get all valid column IDs in kebab-case format
export const getValidColumnIds = (): string[] => {
  return ['todo', 'in-progress', 'review', 'done'];
};
