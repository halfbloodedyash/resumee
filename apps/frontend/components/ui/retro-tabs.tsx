'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface RetroTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const RetroTabs: React.FC<RetroTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex((t) => t.id === tabs[index].id);
    let newIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = (currentEnabledIndex + 1) % enabledTabs.length;
        onTabChange(enabledTabs[newIndex].id);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = (currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length;
        onTabChange(enabledTabs[newIndex].id);
        break;
      case 'Home':
        e.preventDefault();
        onTabChange(enabledTabs[0].id);
        break;
      case 'End':
        e.preventDefault();
        onTabChange(enabledTabs[enabledTabs.length - 1].id);
        break;
    }
  };

  return (
    <div role="tablist" className={cn('flex gap-1.5 border-b border-border pb-2', className)}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const isDisabled = tab.disabled;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled || undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={isDisabled}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isActive && ['bg-primary text-primary-foreground shadow-sm'],
              !isActive &&
                !isDisabled && ['text-muted-foreground hover:text-foreground hover:bg-accent'],
              isDisabled && ['text-muted-foreground/50 cursor-not-allowed opacity-50']
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
