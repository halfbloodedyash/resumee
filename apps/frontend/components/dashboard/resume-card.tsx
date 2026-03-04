'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

interface ResumeCardProps {
  type: 'new' | 'existing';
  title?: string;
  lastEdited?: string;
  onClick?: () => void;
}

export const ResumeCard = ({ type, title, lastEdited, onClick }: ResumeCardProps) => {
  const { t } = useTranslations();
  const baseClasses =
    'aspect-[3/4] w-full rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col p-6';

  if (type === 'new') {
    return (
      <button onClick={onClick} className={`${baseClasses} items-center justify-center group`}>
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Plus size={24} className="text-primary" />
        </div>
        <span className="mt-3 font-medium text-sm text-muted-foreground">
          {t('dashboard.createNew')}
        </span>
      </button>
    );
  }

  return (
    <div onClick={onClick} className={baseClasses}>
      <div className="flex-1 bg-muted rounded-lg mb-4 overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
          {t('dashboard.preview')}
        </div>
      </div>
      <h3 className="font-semibold text-base leading-tight truncate text-card-foreground">
        {title}
      </h3>
      {lastEdited && (
        <p className="text-xs text-muted-foreground mt-1">
          {t('dashboard.edited', { date: lastEdited })}
        </p>
      )}
    </div>
  );
};
