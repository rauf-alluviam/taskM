import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { CheckSquare, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm extends LoginForm {
  name: string;
  confirmPassword: string;
}

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<{
    success: boolean;
    email: string;
    message: string;
  } | null>(null);
  const { login, register: registerUser, loading, error, clearError, emailVerificationRequired, emailForVerification, resendVerification, clearVerificationState } = useAuth();
  
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<RegisterForm>();
  const [resent, setResent] = useState(false);

  const onSubmit = async (data: RegisterForm) => {
    clearError();
    setRegistrationSuccess(null);
    try {
      if (isLogin) {
        await login(data.email, data.password);
      } else {
        const result = await registerUser(data.email, data.password, data.name);
        if (result.success && result.verificationSent) {
          setRegistrationSuccess({
            success: true,
            email: result.email,
            message: result.message || 'Registration successful! Please check your email to verify your account.'
          });
          // Clear the form
          reset();
        }
      }
    } catch (err) {
      // Error is handled by context
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    reset();
    clearError();
    setRegistrationSuccess(null); // Clear registration success when switching modes
  };

  const handleResend = async () => {
    if (emailForVerification) {
      await resendVerification(emailForVerification);
      setResent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-xl flex items-center justify-center">
            <CheckSquare className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Sign in to your TaskFlow account' : 'Get started with TaskFlow today'}
          </p>
        </div>

        <div className="card p-8">
          {/* Registration Success Message */}
          {registrationSuccess && (
            <div className="mb-6 bg-success-50 border border-success-200 rounded-md p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center mr-3">
                  <CheckSquare className="w-5 h-5 text-success-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-success-800">Account Created Successfully!</h3>
                  <p className="text-sm text-success-700 mt-1">
                    {registrationSuccess.message}
                  </p>
                  <p className="text-xs text-success-600 mt-2">
                    Check your email at <strong>{registrationSuccess.email}</strong> and click the verification link to activate your account.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setIsLogin(true)}
                  className="btn-primary btn-sm"
                >
                  Go to Login
                </button>
                <button
                  onClick={() => setRegistrationSuccess(null)}
                  className="btn-outline btn-sm"
                >
                  Register Another Account
                </button>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} style={{ display: registrationSuccess ? 'none' : 'block' }}>
            {error && (
              <div className="bg-error-50 border border-error-200 rounded-md p-3">
                <p className="text-sm text-error-600">{error}</p>
              </div>
            )}
            {emailVerificationRequired && emailForVerification && (
              <div className="bg-warning-50 border border-warning-200 rounded-md p-3 flex flex-col items-center">
                <p className="text-sm text-warning-700 mb-2">Your email is not verified. Please check your inbox for a verification link.</p>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={handleResend}
                  disabled={loading || resent}
                >
                  {resent ? 'Verification Email Sent' : 'Resend Verification Email'}
                </button>
                {resent && <p className="text-xs text-success-600 mt-2">Verification email resent. Please check your inbox.</p>}
                <button
                  type="button"
                  className="text-xs text-gray-500 mt-2 underline"
                  onClick={() => { clearVerificationState(); setResent(false); }}
                >
                  Back to Login
                </button>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('name', { 
                      required: !isLogin ? 'Name is required' : false 
                    })}
                    type="text"
                    className="input pl-10 w-full"
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  className="input pl-10 w-full"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10 w-full"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('confirmPassword', {
                      required: !isLogin ? 'Please confirm your password' : false,
                      validate: (value) => !isLogin && value !== watch('password') ? 'Passwords do not match' : true
                    })}
                    type={showPassword ? 'text' : 'password'}
                    className="input pl-10 w-full"
                    placeholder="Confirm your password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-error-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-lg w-full"
            >
              {loading && <LoadingSpinner size="sm" className="mr-2" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {!registrationSuccess && (
            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;