'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ───── Navigation items ───── */
const navigationItems = [
  { name: 'About us', href: '/about-us', index: '01' },
  { name: 'Our work', href: '/our-work', index: '02' },
  { name: 'Blog', href: '/blog', index: '03' },
  { name: 'Contact us', href: '/contact-us', index: '04' },
] as const;

/* ───── TextRoll animation ───── */
const STAGGER = 0.025;

function TextRoll({
  children,
  className,
  center = false,
}: {
  children: string;
  className?: string;
  center?: boolean;
}) {
  return (
    <motion.span
      initial="initial"
      whileHover="hovered"
      className={cn('relative block overflow-hidden', className)}
      style={{ lineHeight: 0.85 }}
    >
      <div className="flex">
        {children.split('').map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i;
          return (
            <motion.span
              key={i}
              variants={{
                initial: { y: 0 },
                hovered: { y: '-100%' },
              }}
              transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.4, delay }}
              className="inline-block"
            >
              {l === ' ' ? '\u00A0' : l}
            </motion.span>
          );
        })}
      </div>
      <div className="absolute inset-0 flex">
        {children.split('').map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i;
          return (
            <motion.span
              key={i}
              variants={{
                initial: { y: '100%' },
                hovered: { y: 0 },
              }}
              transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.4, delay }}
              className="inline-block"
            >
              {l === ' ' ? '\u00A0' : l}
            </motion.span>
          );
        })}
      </div>
    </motion.span>
  );
}

/* ───── Overlay animation variants ───── */
const overlayVariants = {
  closed: { opacity: 0 },
  open: { opacity: 1 },
};

const menuPanelVariants: Variants = {
  closed: { x: '100%', opacity: 0.5 },
  open: {
    x: '0%',
    opacity: 1,
    transition: { type: 'spring', damping: 30, stiffness: 280, mass: 0.8 },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

const navItemVariants: Variants = {
  closed: { y: 40, opacity: 0 },
  open: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: 0.15 + i * 0.06,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
  exit: (i: number) => ({
    y: -20,
    opacity: 0,
    transition: { delay: i * 0.03, duration: 0.25, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  }),
};

const footerVariants: Variants = {
  closed: { opacity: 0, y: 20 },
  open: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.45, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
};

/* ───── Main Component ───── */
export function SterlingGateKineticNavigation({ inline = false }: { inline?: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const toggleMenu = useCallback(() => setIsMenuOpen((p) => !p), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  /* ── Trigger Button ── */
  const triggerButton = (
    <button
      type="button"
      onClick={toggleMenu}
      className={cn(
        'group relative inline-flex items-center gap-2 px-4 py-2 rounded-full',
        'border border-border/60 bg-card/80 backdrop-blur-sm',
        'text-foreground hover:text-primary hover:border-primary/40',
        'transition-all duration-300 ease-out',
        'hover:shadow-md hover:bg-card',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        isMenuOpen && 'border-primary/40 text-primary bg-card',
      )}
      aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isMenuOpen}
    >
      <span className="text-sm font-medium tracking-wide select-none">
        {isMenuOpen ? 'Close' : 'Menu'}
      </span>
      <span className="relative w-4 h-4 flex items-center justify-center">
        <Menu
          className={cn(
            'w-4 h-4 absolute transition-all duration-300',
            isMenuOpen
              ? 'opacity-0 rotate-90 scale-75'
              : 'opacity-100 rotate-0 scale-100',
          )}
        />
        <X
          className={cn(
            'w-4 h-4 absolute transition-all duration-300',
            isMenuOpen
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-75',
          )}
        />
      </span>
    </button>
  );

  /* ── Fullscreen Overlay (portaled) ── */
  const overlay = (
    <AnimatePresence mode="wait">
      {isMenuOpen && (
        <motion.div
          key="nav-overlay"
          className="fixed inset-0 z-[9999] flex"
          initial="closed"
          animate="open"
          exit="exit"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/95 backdrop-blur-xl"
            variants={overlayVariants}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onClick={closeMenu}
          />

          {/* Menu Panel */}
          <motion.nav
            className="relative ml-auto w-full max-w-2xl h-full flex flex-col justify-center px-8 md:px-16"
            variants={menuPanelVariants}
          >
            {/* Close button inside overlay */}
            <motion.button
              type="button"
              onClick={closeMenu}
              className={cn(
                'absolute top-6 right-6 md:top-8 md:right-10',
                'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                'border border-border/60 bg-card/60 backdrop-blur-sm',
                'text-muted-foreground hover:text-foreground hover:border-primary/40',
                'transition-all duration-300',
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, transition: { delay: 0.3 } }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <span className="text-sm font-medium tracking-wide">Close</span>
              <X className="w-4 h-4" />
            </motion.button>

            {/* Navigation Items */}
            <ul className="flex flex-col gap-2 md:gap-3">
              {navigationItems.map((item, i) => (
                <motion.li
                  key={item.name}
                  custom={i}
                  variants={navItemVariants}
                  className="group"
                >
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className="flex items-baseline gap-4 md:gap-6 py-2 md:py-3 group/link"
                  >
                    <span className="text-xs md:text-sm font-mono text-muted-foreground/50 tabular-nums group-hover/link:text-primary/60 transition-colors duration-300 pt-1">
                      {item.index}
                    </span>
                    <TextRoll
                      center
                      className={cn(
                        'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
                        'font-extrabold uppercase leading-none tracking-[-0.03em]',
                        'text-foreground/90 group-hover/link:text-primary',
                        'transition-colors duration-300',
                      )}
                    >
                      {item.name}
                    </TextRoll>
                  </Link>
                  {i < navigationItems.length - 1 && (
                    <div className="h-px bg-border/20 ml-10 md:ml-14" />
                  )}
                </motion.li>
              ))}
            </ul>

            {/* Footer */}
            <motion.div
              className="mt-12 md:mt-16 ml-10 md:ml-14"
              variants={footerVariants}
            >
              <p className="text-xs font-mono text-muted-foreground/40 tracking-wider uppercase">
                Resume Matcher &copy; {new Date().getFullYear()}
              </p>
            </motion.div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (inline) {
    return (
      <>
        {triggerButton}
        {mounted && createPortal(overlay, document.body)}
      </>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-[80]">
      {triggerButton}
      {mounted && createPortal(overlay, document.body)}
    </div>
  );
}

export { SterlingGateKineticNavigation as Component, TextRoll };
