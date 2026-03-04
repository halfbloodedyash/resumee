'use client';

import React from 'react';
import { useTranslations } from '@/lib/i18n';

export const SwissGrid = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslations();

  return (
    <div className="w-full bg-background">
      {/* Main content area */}
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-8 md:py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            {t('nav.dashboard')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            {t('dashboard.selectModule')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {children}
        </div>
      </div>
    </div>
  );
};
