"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import FeedbackModal from '@/components/FeedbackModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FloatingActionButton from '@/components/FloatingActionButton';
import OnboardingTour from '@/components/OnboardingTour';
import BottomNav from '@/components/BottomNav';
import NotificationCenter from '@/components/NotificationCenter';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthContext } from '@/contexts/AuthContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Lazy-load heavy tab components — only downloaded when the user navigates to them
const PriceSearchHub = dynamic(() => import('@/components/PriceSearchHub'), { ssr: false });
const ProjectsManager = dynamic(() => import('@/components/ProjectsManager'), { ssr: false });
const SmartEstimator = dynamic(() => import('@/components/SmartEstimator'), { ssr: false });
const AccountProfile = dynamic(() => import('@/components/AccountProfile'), { ssr: false });
const About = dynamic(() => import('@/components/About'), { ssr: false });

import {
  Menu,
  HardHat,
  ChevronRight,
  LayoutDashboard,
  Calculator,
  Search,
  FolderOpen,
  Info as InfoIcon,
  User,
  Keyboard,
  X,
} from 'lucide-react';

// Tab metadata for breadcrumbs
const TAB_META: Record<string, { label: string; icon: React.ElementType }> = {
  'dashboard': { label: 'Dashboard', icon: LayoutDashboard },
  'estimator': { label: 'Smart Estimator', icon: Calculator },
  'compare':   { label: 'Price Search', icon: Search },
  'projects':  { label: 'Projects Hub', icon: FolderOpen },
  'about':     { label: 'About', icon: InfoIcon },
  'account':   { label: 'Account', icon: User },
};

export default function Home() {
  const { signOut, userProfile } = useAuthContext();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('buildcompare_active_tab') || 'dashboard';
    } catch { return 'dashboard'; }
  });
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('buildcompare_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // First-run onboarding
  useEffect(() => {
    try {
      const seen = localStorage.getItem('buildcompare_onboarding_complete');
      if (!seen) {
        const timer = setTimeout(() => setShowOnboarding(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('buildcompare_active_tab', activeTab); } catch { }
  }, [activeTab]);

  useEffect(() => {
    try { localStorage.setItem('buildcompare_sidebar_collapsed', String(isSidebarCollapsed)); } catch { }
  }, [isSidebarCollapsed]);

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrlKey: true,
      action: () => setActiveTab('compare'),
      description: 'Open Price Search',
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => setActiveTab('projects'),
      description: 'Go to Projects',
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => setActiveTab('estimator'),
      description: 'Open Smart Estimator',
    },
    {
      key: 'Escape',
      action: () => {
        if (isFeedbackOpen) setIsFeedbackOpen(false);
        else if (showSignOutConfirm) setShowSignOutConfirm(false);
        else if (showShortcutsHelp) setShowShortcutsHelp(false);
      },
      description: 'Close dialogs',
    },
    {
      key: '?',
      ctrlKey: true,
      shiftKey: true,
      action: () => setShowShortcutsHelp(prev => !prev),
      description: 'Show keyboard shortcuts',
    },
  ]);

  const handleTabChange = async (tab: string) => {
    if (tab === 'sign-out') {
      setShowSignOutConfirm(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowSignOutConfirm(false);
  };

  const currentTab = TAB_META[activeTab] || TAB_META['dashboard'];
  const CurrentIcon = currentTab.icon;
  const displayName = userProfile?.displayName || 'Builder';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigateToProjects={() => setActiveTab('projects')}
            onNavigateToCompare={() => setActiveTab('compare')}
            onFeedbackClick={() => setIsFeedbackOpen(true)}
            onShowTutorialClick={() => setShowOnboarding(true)}
          />
        );
      case 'estimator':
        return <SmartEstimator />;
      case 'compare':
        return <PriceSearchHub />;
      case 'projects':
        return (
          <ProjectsManager
            onNavigateToCompare={() => setActiveTab('compare')}
            onNavigateToEstimator={() => setActiveTab('estimator')}
          />
        );
      case 'about':
        return <About />;
      case 'account':
        return <AccountProfile />;
      default:
        return (
          <Dashboard
            onNavigateToProjects={() => setActiveTab('projects')}
            onNavigateToCompare={() => setActiveTab('compare')}
            onFeedbackClick={() => setIsFeedbackOpen(true)}
            onShowTutorialClick={() => setShowOnboarding(true)}
          />
        );
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black font-sans text-slate-100 selection:bg-yellow-500/30 flex overflow-x-hidden">

        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onFeedbackClick={() => setIsFeedbackOpen(true)}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 min-h-screen flex flex-col relative bg-[#020617] transition-all duration-300">

          <header className="h-16 md:h-20 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-black/40 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setIsMobileSidebarOpen(true);
                  } else {
                    setIsSidebarCollapsed(!isSidebarCollapsed);
                  }
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                aria-label="Toggle navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

              <div className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <HardHat className="w-5 h-5 text-black" />
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-sm">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-slate-400 hover:text-yellow-400 font-semibold transition-colors"
                >
                  Home
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <CurrentIcon className="w-4 h-4 text-yellow-400" />
                  {currentTab.label}
                </div>
              </div>

              <div className="sm:hidden flex items-center gap-1.5">
                <CurrentIcon className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-bold text-sm truncate max-w-[140px]">
                  {currentTab.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors text-xs font-semibold"
                title="Keyboard shortcuts"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] border border-slate-700">Ctrl+K</kbd>
              </button>

              <NotificationCenter />

              <button
                onClick={() => setActiveTab('account')}
                className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 flex-shrink-0 hover:border-yellow-500/50 transition-colors"
                title="Account"
              >
                <span className="font-bold text-yellow-400 text-sm md:text-base">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </button>
            </div>
          </header>

          <div key={activeTab} className="p-4 md:p-8 pb-24 lg:pb-8 max-w-[1600px] mx-auto w-full animate-page-enter overflow-x-hidden">
            {renderContent()}
          </div>

          <FeedbackModal
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
          />

          <ConfirmDialog
            isOpen={showSignOutConfirm}
            onClose={() => setShowSignOutConfirm(false)}
            onConfirm={handleSignOut}
            title="Sign Out"
            message="Are you sure you want to sign out of your BuildCompare account?"
            confirmLabel="Sign Out"
            cancelLabel="Stay"
            variant="warning"
          />

          <FloatingActionButton
            onNewProject={() => setActiveTab('projects')}
            onQuickSearch={() => setActiveTab('compare')}
            onScanBoQ={() => setActiveTab('compare')}
            onAskAI={() => setActiveTab('estimator')}
          />

          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

          {showOnboarding && (
            <OnboardingTour
              onComplete={() => setShowOnboarding(false)}
              onNavigate={(tab) => {
                setShowOnboarding(false);
                setActiveTab(tab);
              }}
            />
          )}

          {showShortcutsHelp && (
            <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowShortcutsHelp(false)} />
              <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between p-5 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-yellow-400" />
                    Keyboard Shortcuts
                  </h3>
                  <button onClick={() => setShowShortcutsHelp(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" aria-label="Close shortcuts help">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { keys: 'Ctrl + K', desc: 'Open Price Search' },
                    { keys: 'Ctrl + N', desc: 'Go to Projects' },
                    { keys: 'Ctrl + E', desc: 'Open Smart Estimator' },
                    { keys: 'Escape',   desc: 'Close dialogs & panels' },
                    { keys: 'Ctrl + Shift + ?', desc: 'Show this help' },
                  ].map((s) => (
                    <div key={s.keys} className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-300 font-medium">{s.desc}</span>
                      <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 whitespace-nowrap">
                        {s.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
