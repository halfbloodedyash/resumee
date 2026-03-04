'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, FileText, Mail, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n';

export interface GeneratePromptProps {
  /** Type of content to generate */
  type: 'cover-letter' | 'outreach';
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Callback to trigger generation */
  onGenerate: () => void;
  /** Whether this is a tailored resume (has job context) */
  isTailoredResume: boolean;
  /** Additional class names */
  className?: string;
}

export function GeneratePrompt({
  type,
  isGenerating,
  onGenerate,
  isTailoredResume,
  className,
}: GeneratePromptProps) {
  const { t } = useTranslations();
  const isOutreach = type === 'outreach';
  const Icon = isOutreach ? Mail : FileText;
  const title = isOutreach ? t('outreach.title') : t('coverLetter.title');

  // Show a different message if resume is not tailored
  if (!isTailoredResume) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center min-h-[400px] p-12 text-center',
          className
        )}
      >
        <div className="w-16 h-16 border border-border bg-accent flex items-center justify-center mb-6">
          <Icon className="w-8 h-8 text-muted-foreground/60" />
        </div>
        <h3 className="text-sm font-bold text-muted-foreground mb-3">
          {t('builder.generatePrompt.notAvailableTitle', { title })}
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
          {t('builder.generatePrompt.notAvailableDescription', { title })}
        </p>
        <div className="flex items-center gap-2 text-primary text-xs">
          <span>{t('builder.generatePrompt.goToDashboard')}</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] p-12 text-center',
        className
      )}
    >
      <div className="w-16 h-16 border border-primary bg-primary/10 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-sm font-bold mb-3">
        {t('builder.generatePrompt.generateTitle', { title })}
      </h3>
      <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
        {isOutreach
          ? t('builder.generatePrompt.outreachDescription')
          : t('builder.generatePrompt.coverLetterDescription')}
      </p>
      <Button onClick={onGenerate} disabled={isGenerating} className="gap-2">
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('common.generating')}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {t('builder.generatePrompt.generateButton', { title })}
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground/60 mt-4">
        {isOutreach
          ? t('builder.generatePrompt.outreachFooter')
          : t('builder.generatePrompt.coverLetterFooter')}
      </p>
    </div>
  );
}
