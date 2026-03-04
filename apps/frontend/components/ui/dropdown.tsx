'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

export interface DropdownOption {
  id: string;
  label: string;
  description?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}: DropdownProps) {
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);
  const dropdownId = React.useId();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Reset active index when opening
  const toggleOpen = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        const selectedIdx = options.findIndex((opt) => opt.id === value);
        setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
      }
    },
    [options, value]
  );

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, activeIndex]);

  const handleSelect = useCallback(
    (optionId: string) => {
      onChange(optionId);
      setIsOpen(false);
      buttonRef.current?.focus();
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            toggleOpen(true);
          } else {
            setActiveIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) {
            toggleOpen(true);
          } else {
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen && activeIndex >= 0) {
            handleSelect(options[activeIndex].id);
          } else {
            toggleOpen(true);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case 'Home':
          if (isOpen) {
            e.preventDefault();
            setActiveIndex(0);
          }
          break;
        case 'End':
          if (isOpen) {
            e.preventDefault();
            setActiveIndex(options.length - 1);
          }
          break;
      }
    },
    [disabled, isOpen, activeIndex, options, handleSelect, toggleOpen]
  );

  return (
    <div className={`space-y-1 ${className}`} ref={containerRef}>
      {label && (
        <label id={`${dropdownId}-label`} className="block text-sm font-medium text-black">
          {label}
        </label>
      )}

      {description && <p className="text-sm text-gray-500">{description}</p>}

      <div className="relative">
        {/* Trigger Button */}
        <button
          ref={buttonRef}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? `${dropdownId}-list` : undefined}
          aria-labelledby={label ? `${dropdownId}-label` : undefined}
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? `${dropdownId}-option-${activeIndex}` : undefined
          }
          onClick={() => toggleOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-full flex items-center justify-between rounded-lg border border-border bg-input px-4 py-2.5 text-sm transition-all duration-200 ease-out hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        >
          <div className="flex-1 text-left min-w-0">
            {selectedOption ? (
              <div>
                <div className="font-medium text-foreground truncate">{selectedOption.label}</div>
                {selectedOption.description && (
                  <div className="text-xs text-muted-foreground mt-1 font-normal truncate">
                    {selectedOption.description}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-400">{t('common.selectOption')}</span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ml-2 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            id={`${dropdownId}-list`}
            ref={listRef}
            role="listbox"
            aria-labelledby={label ? `${dropdownId}-label` : undefined}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto">
              {options.map((option, index) => (
                <button
                  key={option.id}
                  id={`${dropdownId}-option-${index}`}
                  role="option"
                  aria-selected={option.id === value}
                  data-index={index}
                  onClick={() => handleSelect(option.id)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full border-b border-border last:border-b-0 px-4 py-3 text-left transition-all duration-150 ${
                    option.id === value
                      ? 'bg-primary/15 text-primary'
                      : index === activeIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-popover text-popover-foreground hover:bg-accent/50'
                  } active:bg-accent`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{option.label}</div>
                      {option.description && (
                        <div className="text-xs mt-1 opacity-80">{option.description}</div>
                      )}
                    </div>
                    {option.id === value && <Check className="w-4 h-4 mt-0.5 shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
