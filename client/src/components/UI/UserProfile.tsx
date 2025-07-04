import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Save, Edit3, Camera, Check, X } from 'lucide-react';
import { userAPI } from '../../services/api';

interface UserProfileData {
  _id: string;
  name: string;
  email: string;
  mobile?: string;
  organization?: string | { _id: string; name: string };
  role: string;
  avatar?: string;
  avatarUrl?: string;
  department?: string;
  createdAt: string;
}

interface UserProfileProps {
  onUserUpdate?: (user: UserProfileData) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onUserUpdate }) => {  const [user, setUser] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    organization: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await userAPI.getCurrentUser();
      setUser(userData);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        mobile: userData.mobile || '',
        organization: typeof userData.organization === 'object' && userData.organization !== null 
          ? (userData.organization as any).name || ''
          : userData.organization || '',
      });
    } catch (error) {
      setError('Failed to load user profile');
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const updatedUser = await userAPI.updateCurrentUser(formData);
      setUser(updatedUser);
      setEditing(false);
      onUserUpdate?.(updatedUser);
    } catch (error) {
      setError('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      mobile: user?.mobile || '',
      organization: typeof user?.organization === 'object' && user?.organization !== null 
        ? (user?.organization as any).name || ''
        : user?.organization || '',
    });
    setEditing(false);
    setError(null);
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAvatarClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleAvatarSelect;
    input.click();
  };

  const handleAvatarSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Avatar file size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      setAvatarFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Auto-upload the avatar
      uploadAvatar(file);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUploadingAvatar(true);
      setError(null);
      
      const response = await userAPI.uploadAvatar(file);
      
      // Update user data with new avatar
      setUser(prev => prev ? {
        ...prev,
        avatar: response.user.avatar,
        avatarUrl: response.avatarUrl
      } : null);
      
      setPreviewUrl(null);
      setAvatarFile(null);
      
      onUserUpdate?.(response.user);
      
    } catch (error) {
      setError('Failed to upload avatar');
      console.error('Error uploading avatar:', error);
      setPreviewUrl(null);
      setAvatarFile(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load user profile</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">            <div className="relative">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                {uploadingAvatar ? (
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : user.avatar || (user as any).avatarUrl ? (
                  <img 
                    src={(user as any).avatarUrl || user.avatar} 
                    alt={user.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <button 
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingAvatar ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Camera className="w-3 h-3 text-white" />
                )}
              </button>
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-blue-100 capitalize">{user.role}</p>
              {user.department && (
                <p className="text-blue-200 text-sm">{user.department}</p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{user.name}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email address"
                />
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{user.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            
            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your mobile number"
                />
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{user.mobile || 'Not provided'}</span>
                </div>
              )}
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => handleInputChange('organization', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your organization"
                />
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">
                    {typeof user.organization === 'object' && user.organization !== null 
                      ? (user.organization as any).name || 'Not provided'
                      : user.organization || 'Not provided'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Role</p>
              <p className="text-sm text-gray-900 capitalize mt-1">{user.role}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Member Since</p>
              <p className="text-sm text-gray-900 mt-1">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">User ID</p>
              <p className="text-sm text-gray-500 font-mono mt-1">{user._id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
