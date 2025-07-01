import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const VerifyEmail: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }
    authAPI.verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified! You can now log in.');
        setTimeout(() => navigate('/login'), 2500);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'Verification failed. The link may have expired.');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center card p-8">
        {status === 'loading' && <LoadingSpinner size="lg" />}
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Email Verification</h2>
        <p className={`mt-4 text-md ${status === 'error' ? 'text-error-600' : 'text-success-700'}`}>{message}</p>
        {status === 'success' && <p className="mt-2 text-sm text-gray-600">Redirecting to login...</p>}
        {status === 'error' && <button className="btn-primary mt-4" onClick={() => navigate('/login')}>Back to Login</button>}
      </div>
    </div>
  );
};

export default VerifyEmail; 