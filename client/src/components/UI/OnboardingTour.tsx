import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Users, FolderOpen, ArrowRight, Sparkles } from 'lucide-react';

interface Assignment {
  teams: Array<{
    _id: string;
    name: string;
    role: string;
  }>;
  projects: Array<{
    _id: string;
    name: string;
    role: string;
  }>;
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  assignments?: Assignment;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose, assignments }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const steps = [
    {
      title: "Welcome to TaskM!",
      content: "You've successfully joined the organization. Let's take a quick tour of your new workspace.",
      icon: <Sparkles className="w-8 h-8 text-purple-600" />
    },
    ...(assignments?.teams && assignments.teams.length > 0 ? [{
      title: "Your Team Assignments",
      content: "You've been assigned to teams where you can collaborate with colleagues.",
      icon: <Users className="w-8 h-8 text-blue-600" />,
      assignments: assignments.teams,
      type: 'teams' as const
    }] : []),
    ...(assignments?.projects && assignments.projects.length > 0 ? [{
      title: "Your Project Assignments",
      content: "You're now part of projects where you can contribute and track progress.",
      icon: <FolderOpen className="w-8 h-8 text-green-600" />,
      assignments: assignments.projects,
      type: 'projects' as const
    }] : []),
    {
      title: "Ready to Get Started!",
      content: "You're all set! Start exploring your dashboard, create tasks, and collaborate with your team.",
      icon: <CheckCircle className="w-8 h-8 text-emerald-600" />
    }
  ];

  useEffect(() => {
    if (isOpen && currentStep === steps.length - 1) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isOpen, steps.length]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // Clear session storage
    sessionStorage.removeItem('invitationAssignments');
    sessionStorage.removeItem('showOnboarding');
    onClose();
  };

  const renderAssignments = (assignments: any[], type: 'teams' | 'projects') => {
    return (
      <div className="mt-4 space-y-3">
        {assignments.map((assignment, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{assignment.name}</h4>
                <p className="text-sm text-gray-600">
                  You've been assigned as: <span className="font-medium capitalize">{assignment.role}</span>
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                type === 'teams' ? 'bg-blue-400' : 'bg-green-400'
              }`} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              🎉
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {currentStepData.icon}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {currentStepData.title}
              </h2>
              <p className="text-sm text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-lg mb-6">
            {currentStepData.content}
          </p>

          {/* Show assignments if applicable */}
          {currentStepData.assignments && currentStepData.type && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                {currentStepData.type === 'teams' ? 'Your Teams:' : 'Your Projects:'}
              </h3>
              {renderAssignments(currentStepData.assignments, currentStepData.type)}
            </div>
          )}

          {/* Special content for final step */}
          {currentStep === steps.length - 1 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mt-4">
              <h3 className="font-medium text-gray-900 mb-3">Quick Tips:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Use the dashboard to get an overview of your tasks and projects
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Check the Teams section to see your team members
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Visit Projects to see what you're working on
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Update your profile in Settings to personalize your experience
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Previous
          </button>

          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextStep}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
