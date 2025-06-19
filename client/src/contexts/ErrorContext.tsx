import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ErrorInfo {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'network' | 'validation';
  timestamp: Date;
  action?: string;
  details?: any;
}

interface ErrorContextType {
  errors: ErrorInfo[];
  addError: (error: Omit<ErrorInfo, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);

  const addError = (error: Omit<ErrorInfo, 'id' | 'timestamp'>) => {
    const newError: ErrorInfo = {
      ...error,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setErrors(prev => [...prev, newError]);

    // Auto-remove errors after 10 seconds for network/temporary errors
    if (error.type === 'network' || error.type === 'warning') {
      setTimeout(() => {
        removeError(newError.id);
      }, 10000);
    }
  };

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const hasErrors = errors.length > 0;

  return (
    <ErrorContext.Provider value={{
      errors,
      addError,
      removeError,
      clearErrors,
      hasErrors
    }}>
      {children}
    </ErrorContext.Provider>
  );
};

// Global error handler utility
export const handleApiError = (error: any, addError: (error: Omit<ErrorInfo, 'id' | 'timestamp'>) => void) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || 'An error occurred';
    
    if (status === 401) {
      addError({
        message: 'Session expired. Please log in again.',
        type: 'error',
        action: 'logout'
      });
    } else if (status === 403) {
      addError({
        message: 'You do not have permission to perform this action.',
        type: 'error'
      });
    } else if (status === 404) {
      addError({
        message: 'The requested resource was not found.',
        type: 'warning'
      });
    } else if (status === 429) {
      addError({
        message: 'Too many requests. Please wait a moment and try again.',
        type: 'warning'
      });
    } else if (status >= 500) {
      addError({
        message: 'Server error. Please try again later.',
        type: 'error',
        details: { status, originalMessage: message }
      });
    } else {
      addError({
        message,
        type: 'error',
        details: { status }
      });
    }
  } else if (error.request) {
    // Network error
    addError({
      message: 'Network error. Please check your connection and try again.',
      type: 'network'
    });
  } else {
    // Other error
    addError({
      message: error.message || 'An unexpected error occurred.',
      type: 'error'
    });
  }
};
