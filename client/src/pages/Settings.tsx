import React, { useState } from 'react';
import { Save, Bell, Shield, User, Palette } from 'lucide-react';
import UserProfile from '../components/UI/UserProfile';

interface SettingsData {
  profile: {
    name: string;
    email: string;
    avatar: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    taskReminders: boolean;
    projectUpdates: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    dateFormat: string;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
    allowAnalytics: boolean;
  };
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'preferences' | 'privacy'>('profile');
  const [settings, setSettings] = useState<SettingsData>({
    profile: {
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '',
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      taskReminders: true,
      projectUpdates: true,
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
    },
    privacy: {
      profileVisible: true,
      activityVisible: false,
      allowAnalytics: true,
    },
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // TODO: Save settings to API and show notification
    console.log('Saving settings:', settings);
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };

  const updateSetting = (section: keyof SettingsData, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const navigationItems = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'preferences', name: 'Preferences', icon: Palette },
    { id: 'privacy', name: 'Privacy', icon: Shield },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your account preferences and settings</p>
        </div>
        {activeTab !== 'profile' && (
          <button 
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-2 text-left text-sm font-medium rounded-md transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-500'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'profile' && (
            <UserProfile />
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">Notifications</h3>
              <div className="space-y-4">
                {Object.entries(settings.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </p>
                    </div>
                    <button
                      onClick={() => updateSetting('notifications', key, !value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">Preferences</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Theme
                  </label>
                  <select
                    className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={settings.preferences.theme}
                    onChange={(e) => updateSetting('preferences', 'theme', e.target.value)}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Language
                  </label>
                  <select
                    className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={settings.preferences.language}
                    onChange={(e) => updateSetting('preferences', 'language', e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Timezone
                  </label>
                  <select
                    className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={settings.preferences.timezone}
                    onChange={(e) => updateSetting('preferences', 'timezone', e.target.value)}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Date Format
                  </label>
                  <select
                    className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={settings.preferences.dateFormat}
                    onChange={(e) => updateSetting('preferences', 'dateFormat', e.target.value)}
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">Privacy</h3>
              <div className="space-y-4">
                {Object.entries(settings.privacy).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </p>
                    </div>
                    <button
                      onClick={() => updateSetting('privacy', key, !value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
