import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccountContextType {
  globalAccountId: string | null;
  lastSpecificAccountId: string | null;
  setGlobalAccountId: (id: string | null) => void;
  setLastSpecificAccountId: (id: string | null) => void;
  setAccount: (id: string | null) => void; // Unifies setting both
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const [globalAccountId, setGlobalState] = useState<string | null>(() => {
    return localStorage.getItem('global-account-id') || null;
  });

  const [lastSpecificAccountId, setLastSpecificState] = useState<string | null>(() => {
    return localStorage.getItem('last-specific-account-id') || null;
  });

  useEffect(() => {
    if (globalAccountId) {
      localStorage.setItem('global-account-id', globalAccountId);
    } else {
      localStorage.removeItem('global-account-id');
    }
  }, [globalAccountId]);

  useEffect(() => {
    if (lastSpecificAccountId) {
      localStorage.setItem('last-specific-account-id', lastSpecificAccountId);
    } else {
      localStorage.removeItem('last-specific-account-id');
    }
  }, [lastSpecificAccountId]);

  const setGlobalAccountId = (id: string | null) => {
    setGlobalState(id);
    if (id && id !== 'all') {
        setLastSpecificState(id);
    }
  };

  const setLastSpecificAccountId = (id: string | null) => {
    setLastSpecificState(id);
  };

  const setAccount = (id: string | null) => {
    setGlobalAccountId(id);
  };

  return (
    <AccountContext.Provider 
      value={{ 
        globalAccountId, 
        lastSpecificAccountId, 
        setGlobalAccountId, 
        setLastSpecificAccountId,
        setAccount 
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccountContext = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
};
