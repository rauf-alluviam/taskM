// Helper functions for the MasterTypeManager component
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString();
};

export const getDaysUntilDue = (dueDate: string | undefined): number | null => {
  if (!dueDate) return null;
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getStatusColor = (daysUntilDue: number | null): 'error' | 'warning' | 'success' | 'default' => {
  if (daysUntilDue === null) return 'default';
  if (daysUntilDue < 0) return 'error';
  if (daysUntilDue <= 7) return 'warning';
  return 'success';
};

export const getCompanyInitials = (companyName: string): string => {
  return companyName
    ?.split(' ')
    .map(word => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';
};

export const getRandomColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#3b82f6', '#ef4444', '#f59e0b', '#10b981',
    '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};
