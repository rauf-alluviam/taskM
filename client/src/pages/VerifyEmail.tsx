import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmail: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const [autoRedirect, setAutoRedirect] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    // Try to extract email from localStorage if available (from registration)
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
    
    authAPI.verifyEmail(token)
      .then((response) => {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        
        // If the backend returned a token, store it for auto-login
        if (response.token) {
          localStorage.setItem('token', response.token);
          // Redirect to dashboard after a delay
          if (autoRedirect) {
            setTimeout(() => navigate('/dashboard'), 2500);
          }
        } else {
          // Otherwise redirect to login
          if (autoRedirect) {
            setTimeout(() => navigate('/login'), 2500);
          }
        }
        
        // Clear the pending verification email
        localStorage.removeItem('pendingVerificationEmail');
      })
      .catch((err) => {
        // Check if token is expired
        if (err?.response?.data?.expired) {
          setStatus('expired');
          setMessage(err?.response?.data?.message || 'Your verification link has expired.');
        } else {
          setStatus('error');
          setMessage(err?.response?.data?.message || 'Verification failed. The link may be invalid.');
        }
      });
  }, [searchParams, navigate, autoRedirect, login]);

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('Please go to login page and use the "Resend verification email" option.');
      return;
    }
    
    setStatus('loading');
    setMessage('Sending a new verification email...');
    
    try {
      await authAPI.resendVerification(email);
      setMessage('A new verification email has been sent! Please check your inbox.');
    } catch (error: any) {
      if (error.response?.status === 429) {
        setMessage('Too many attempts. Please wait before requesting another verification email.');
      } else {
        setMessage(error.response?.data?.message || 'Failed to resend verification email.');
      }
      setStatus('expired'); // Keep the resend button
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center card p-8">
        {status === 'loading' ? (
          <div className="flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : status === 'success' ? (
          <div className="w-16 h-16 mx-auto bg-success-100 rounded-full flex items-center justify-center">
            <CheckCircle size={36} className="text-success-600" />
          </div>
        ) : (
          <div className="w-16 h-16 mx-auto bg-error-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={36} className="text-error-600" />
          </div>
        )}
        
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Email Verification</h2>
        <p className={`mt-4 text-md ${status === 'error' || status === 'expired' ? 'text-error-600' : 'text-success-700'}`}>
          {message}
        </p>
        
        {status === 'success' && autoRedirect && (
          <p className="mt-2 text-sm text-gray-600">
            Redirecting you automatically...
            <button 
              onClick={() => setAutoRedirect(false)}
              className="text-primary-600 underline ml-2"
            >
              Cancel
            </button>
          </p>
        )}
        
        {status === 'success' && !autoRedirect && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">You can now access your account.</p>
            <div className="flex flex-col space-y-2">
              <Link to="/dashboard" className="btn-primary">
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
        
        {status === 'expired' && (
          <div className="mt-4 space-y-4">
            <button 
              className="btn-primary flex items-center justify-center w-full"
              onClick={handleResendVerification}
              disabled={status === 'loading'}
            >
              <RefreshCw size={18} className="mr-2" />
              Resend Verification Email
            </button>
          </div>
        )}
        
        {(status === 'error' || status === 'expired') && (
          <div className="mt-4">
            <Link to="/login" className="btn-secondary mt-4">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail; 