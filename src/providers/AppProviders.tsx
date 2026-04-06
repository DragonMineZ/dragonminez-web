import React from 'react';
import type { ReactNode } from 'react';
import { LanguageProvider } from '../i18n';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Root React Provider that wraps all interactive islands.
 * This ensures common context (i18n, etc.) is shared across components.
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
};

export default AppProviders;
