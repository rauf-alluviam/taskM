import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { socketService } from '../services/socket';

export interface User {
  _id: string;
  id: string;
  email: string;
  name: string;
  mobile?: string;
  organization?: {
    _id: string;
    name: string;
  };
  role: 'super_admin' | 'org_admin' | 'team_lead' | 'member' | 'viewer';
  avatar?: string;
  department?: string;
  teams?: Array<{
    team: {
      _id: string;
      name: string;
    };
    role: string;
    joinedAt: Date;
  }>;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  emailVerificationRequired?: boolean;
  emailForVerification?: string;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'EMAIL_VERIFICATION_REQUIRED'; payload: string };

const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
  emailVerificationRequired: false,
  emailForVerification: undefined,
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
    case 'EMAIL_VERIFICATION_REQUIRED':
      return { ...state, emailVerificationRequired: true, emailForVerification: action.payload, loading: false };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role?: string
  ) => Promise<
    | { success: boolean; verificationSent: boolean; email?: any; message?: any }
    | { success: boolean; verificationSent: boolean; email?: undefined; message?: undefined }
  >;
  logout: () => void;
  clearError: () => void;
  resendVerification: (email: string, force?: boolean) => Promise<{
    success: boolean, 
    rateLimited?: boolean, 
    waitTimeSeconds?: number,
    canRetryImmediately?: boolean,
    serverError?: boolean,
    message?: string
  }>;
  clearVerificationState: () => void;
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
      if (error.response?.data?.resend) {
        // This means email is not verified
        dispatch({ type: 'EMAIL_VERIFICATION_REQUIRED', payload: email });
        dispatch({ type: 'SET_ERROR', payload: error.response.data.message || 'Your email is not verified. Please verify to continue.' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || error.message || 'Login failed' });
      }
    }
  };

  const register = async (email: string, password: string, name: string, role = 'member') => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.register(email, password, name, role);
      
      // New flow: User is NOT automatically logged in after registration
      // They must verify their email first
      if (response.verificationSent) {
        localStorage.setItem('pendingVerificationEmail', email);
        // Don't set user or token - they need to verify email first
        dispatch({ type: 'SET_LOADING', payload: false }); // Clear loading state
        return { 
          success: true, 
          verificationSent: true, 
          email: response.email || email,
          message: response.message 
        };
      }
      
      // Fallback for cases where verification is not required (shouldn't happen in production)
      if (response.token) {
        localStorage.setItem('token', response.token);
        dispatch({ type: 'SET_USER', payload: response.user });
      }
      
      dispatch({ type: 'SET_LOADING', payload: false }); // Clear loading state
      return { success: true, verificationSent: false };
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Registration failed' });
      throw error;
    }
  };

  const logout = () => {
    // Check if there's a redirect URL stored in session storage
    const redirectUrl = sessionStorage.getItem('redirectAfterLogout');
    
    // Clear auth data
    localStorage.removeItem('token');
    socketService.disconnect();
    dispatch({ type: 'LOGOUT' });
    
    // Handle redirect if specified
    if (redirectUrl) {
      sessionStorage.removeItem('redirectAfterLogout');
      // We don't navigate here to avoid issues with component unmounting
      // The component that called logout will handle the redirect
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const resendVerification = async (email: string, force: boolean = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await authAPI.resendVerification(email, force);
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: true };
    } catch (error: any) {
      // Check if it's a rate limit error
      if (error.response?.status === 429) {
        const waitTimeSeconds = error.response.data.waitTimeSeconds || 300; // Default to 5 minutes
        dispatch({ type: 'SET_ERROR', payload: error.response.data.message || 'Please wait before requesting another verification email.' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return { 
          success: false, 
          rateLimited: true, 
          waitTimeSeconds: waitTimeSeconds 
        };
      } else if (error.response?.status === 500 && error.response.data.canRetryImmediately) {
        // Server error but can retry immediately
        dispatch({ type: 'SET_ERROR', payload: 'Failed to send verification email. Please try again.' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return { 
          success: false, 
          canRetryImmediately: true,
          serverError: true,
          message: error.response.data.error
        };
      } else if (error.response?.status === 500 && error.response.data.canRetryImmediately) {
        // Server error but can retry immediately
        dispatch({ type: 'SET_ERROR', payload: 'Failed to send verification email. Please try again.' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return { 
          success: false, 
          canRetryImmediately: true,
          serverError: true,
          message: error.response.data.error
        };
      } else {
        dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to resend verification email' });
        return { success: false };
      }
    }
  };

  const clearVerificationState = () => {
    dispatch({ type: 'EMAIL_VERIFICATION_REQUIRED', payload: '' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    resendVerification,
    clearVerificationState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};