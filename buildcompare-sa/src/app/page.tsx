"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import PriceSearchHub from '@/components/PriceSearchHub';
import AIConcierge from '@/components/AIConcierge';
import ProjectsManager from '@/components/ProjectsManager';
import SmartEstimator from '@/components/SmartEstimator';
import CostAnalysis from '@/components/CostAnalysis';
import AccountProfile from '@/components/AccountProfile';
import FeedbackModal from '@/components/FeedbackModal';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthContext } from '@/contexts/AuthContext';
import { MessageSquare, Menu, HardHat } from 'lucide-react';

export default function Home() {
  const { signOut } = useAuthContext();
  const [activeTab, setActiveTab] = useState('compare');
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleTabChange = async (tab: string) => {
    if (tab === 'sign-out') {
      if (confirm('Are you sure you want to sign out?')) {
        await signOut();
      }
      return;
    }
    setActiveTab(tab);
  };

  // Render the appropriate component
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard
          onNavigateToProjects={() => setActiveTab('projects')}
          onNavigateToCompare={() => setActiveTab('compare')}
        />;
      case 'estimator':
        return <SmartEstimator />;
      case 'compare':
        return <PriceSearchHub />;
      case 'projects':
        return <ProjectsManager
          onNavigateToCompare={() => setActiveTab('compare')}
          onNavigateToEstimator={() => setActiveTab('estimator')}
          onNavigateToAnalytics={() => setActiveTab('cost-analysis')}
        />;
      case 'cost-analysis':
        return <CostAnalysis />;
      case 'account':
        return <AccountProfile />;
      default:
        return <Dashboard
          onNavigateToProjects={() => setActiveTab('projects')}
          onNavigateToCompare={() => setActiveTab('compare')}
        />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black font-sans text-slate-100 selection:bg-yellow-500/30 flex overflow-x-hidden">

        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onFeedbackClick={() => setIsFeedbackOpen(true)}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-h-screen flex flex-col relative bg-[#020617] transition-all duration-300 w-full">

          {/* Top Header Bar */}
          <header className="h-20 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-black/40 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setIsMobileSidebarOpen(true);
                  } else {
                    setIsSidebarCollapsed(!isSidebarCollapsed);
                  }
                }}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

              {/* Mobile Logo */}
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <HardHat className="w-5 h-5 text-black" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2">
                <span className="text-slate-500 font-bold tracking-wider text-[10px] sm:text-xs uppercase">PROJECT:</span>
                <span className="text-white font-bold tracking-wide text-xs sm:text-sm uppercase truncate max-w-[120px] sm:max-w-none">
                  SANDTON MALL RENOVATION
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
              <button
                onClick={() => setIsConciergeOpen(true)}
                className="flex items-center gap-2 px-3 md:px-6 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-full transition-all shadow-lg shadow-yellow-400/10 text-xs sm:text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden xs:inline">Ask AI Concierge</span>
                <span className="xs:hidden">AI</span>
              </button>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 flex-shrink-0">
                <span className="font-bold text-yellow-400 text-sm md:text-base">S</span>
              </div>
            </div>
          </header>

          {/* Dynamic Content */}
          <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto w-full animate-fade-in overflow-x-hidden">
            {renderContent()}
          </div>

          {/* AI Concierge Sidebar */}
          <AIConcierge
            isOpen={isConciergeOpen}
            onToggle={() => setIsConciergeOpen(!isConciergeOpen)}
          />

          {/* Feedback Modal */}
          <FeedbackModal
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}
