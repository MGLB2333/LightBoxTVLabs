import React, { createContext, useContext, useState } from 'react';

const BannerContext = createContext<{
  banner: React.ReactNode;
  setBanner: (banner: React.ReactNode) => void;
}>({ banner: null, setBanner: () => {} });

export const BannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [banner, setBanner] = useState<React.ReactNode>(null);
  return (
    <BannerContext.Provider value={{ banner, setBanner }}>
      {children}
    </BannerContext.Provider>
  );
};

export const useBanner = () => useContext(BannerContext).banner;
export const useSetBanner = () => useContext(BannerContext).setBanner; 