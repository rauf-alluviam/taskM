import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import QuickTaskModal from '../Modals/QuickTaskModal';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar - Fixed positioning for mobile, flex item for desktop */}
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Mobile sidebar overlay */}
      <div className="lg:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          onQuickTask={() => setQuickTaskOpen(true)}
        />
        
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <QuickTaskModal 
        isOpen={quickTaskOpen}
        onClose={() => setQuickTaskOpen(false)}
      />
    </div>
  );
};

export default Layout;