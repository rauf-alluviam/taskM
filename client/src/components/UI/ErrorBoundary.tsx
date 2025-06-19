import React from 'react';
import { AlertTriangle, X, Wifi, AlertCircle, Info } from 'lucide-react';
import { useError } from '../../contexts/ErrorContext';

const ErrorBoundary: React.FC = () => {
  const { errors, removeError, clearErrors } = useError();

  if (errors.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'network':
        return <Wifi className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'validation':
        return <Info className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case 'network':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'validation':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.slice(-3).map((error) => (
        <div
          key={error.id}
          className={`flex items-start space-x-3 p-4 rounded-lg border shadow-lg ${getColorClasses(error.type)}`}
        >
          <div className="flex-shrink-0">
            {getIcon(error.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{error.message}</p>
            {error.details && (
              <p className="text-xs mt-1 opacity-75">
                {JSON.stringify(error.details)}
              </p>
            )}
          </div>
          <button
            onClick={() => removeError(error.id)}
            className="flex-shrink-0 p-1 hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      
      {errors.length > 3 && (
        <div className="text-center">
          <button
            onClick={clearErrors}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Clear all errors ({errors.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorBoundary;
