// Email Settings Page
import React from 'react';
import { useNavigate } from 'react-router-dom';
import EmailTester from '../components/Admin/EmailTester';

const EmailSettings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Email Settings</h1>
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
        >
          Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Email Configuration</h2>
        <p className="text-gray-600 mb-4">
          Email is configured via environment variables on the server. 
          Contact your administrator to change the SMTP settings.
        </p>
        
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <h3 className="text-md font-medium text-blue-800 mb-2">Current Configuration</h3>
          <ul className="list-disc pl-5 text-sm text-blue-700">
            <li>SMTP settings are defined in the server's .env file</li>
            <li>Email templates are managed by the server application</li>
            <li>Use the tools below to test email functionality</li>
          </ul>
        </div>
      </div>

      <EmailTester />
    </div>
  );
};

export default EmailSettings;
