import React, { useState, createContext, useContext } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import PageBanner from './PageBanner';
import AIDrawer from './AIDrawer';
import { BannerProvider, useBanner } from './BannerContext';
import { Outlet, useLocation } from 'react-router-dom';

// Context for AI drawer open handler
const AIContext = createContext<{ openAIDrawer: (tab?: 'chat' | 'recommendations') => void }>({ openAIDrawer: () => {} });
export const useAIDrawer = () => useContext(AIContext);

const PAGE_TITLES: Record<string, string> = {
  '/analytics': 'Campaigns',
  '/analytics-insights': 'Analytics',
  '/integrations': 'Integrations',
  '/my-organizations': 'My Organizations',
  '/audience-builder': 'Audience Builder',
  '/youtube-curation': 'YouTube Curation',
  '/tv-intelligence': 'TV Intelligence',
};

const LayoutInner: React.FC = () => {
  const banner = useBanner();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || '';
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [aiDrawerTab, setAIDrawerTab] = useState<'chat' | 'recommendations'>('chat');

  const openAIDrawer = (tab: 'chat' | 'recommendations' = 'chat') => {
    setAIDrawerTab(tab);
    setIsAIDrawerOpen(true);
  };

  return (
    <AIContext.Provider value={{ openAIDrawer }}>
      <div className="flex flex-col min-h-screen pt-14">
        <Header />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <main className="flex-1 min-h-0 flex flex-col">
            <PageBanner>
              <div className="px-6 md:px-10 w-full flex items-center justify-between">
                <div className="flex-1">
                  {banner || <span className="text-xl font-bold text-gray-900">{pageTitle}</span>}
                </div>
              </div>
            </PageBanner>
            <div className="px-6 md:px-10 py-6 flex-1">
              <Outlet />
            </div>
          </main>
        </div>
        <AIDrawer 
          isOpen={isAIDrawerOpen} 
          onClose={() => setIsAIDrawerOpen(false)} 
          initialTab={aiDrawerTab}
        />
      </div>
    </AIContext.Provider>
  );
};

const Layout: React.FC = () => (
  <BannerProvider>
    <LayoutInner />
  </BannerProvider>
);

export default Layout; 