import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { socketService } from '../services/socket';

interface User {
  id: string;
  email: string;
  name: string;
  mobile?: string;
  organization?: string;
  role: 'admin' | 'manager' | 'member';
  avatar?: string;
  department?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, loading: false, error: null };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      const user = await authAPI.verifyToken();
      dispatch({ type: 'SET_USER', payload: user });
      
      // Connect socket if user is authenticated
      socketService.connect(token);
    } catch (error) {
      localStorage.removeItem('token');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user, token } = await authAPI.login(email, password);
      localStorage.setItem('token', token);
      dispatch({ type: 'SET_USER', payload: user });
      
      // Connect socket with authentication
      socketService.connect(token);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Login failed' });
    }
  };

  const register = async (email: string, password: string, name: string, role = 'member') => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user, token } = await authAPI.register(email, password, name, role);
      localStorage.setItem('token', token);
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Registration failed' });
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    socketService.disconnect();
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};