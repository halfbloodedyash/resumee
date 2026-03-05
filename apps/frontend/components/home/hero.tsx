'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  FileText,
  Settings,
  Zap,
  Target,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';
import { LineShadowText } from '@/components/ui/line-shadow-text';
import { Highlighter } from '@/components/ui/highlighter';

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */
function useCounter(end: number, duration = 2000, start = 0) {
  const [value, setValue] = useState(start);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasStarted, end, duration, start]);

  return { value, trigger: () => setHasStarted(true) };
}

/* ------------------------------------------------------------------ */
/*  Intersection observer hook for scroll-triggered animations         */
/* ------------------------------------------------------------------ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/* ------------------------------------------------------------------ */
/*  Hero component                                                     */
/* ------------------------------------------------------------------ */
export default function Hero() {
  const { t } = useTranslations();

  /* Mouse-tracking glow */
  const heroRef = useRef<HTMLElement>(null);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  /* Section in-view hooks */
  const statsSection = useInView(0.2);
  const cardsSection = useInView(0.1);

  /* Stat counters */
  const counter1 = useCounter(98, 2200);
  const counter2 = useCounter(50, 1800);
  const counter3 = useCounter(10, 1400);

  useEffect(() => {
    if (statsSection.inView) {
      counter1.trigger();
      counter2.trigger();
      counter3.trigger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsSection.inView]);

  /* Staggered reveal */
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReveal(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen w-full bg-background overflow-hidden"
    >
      {/* ---- Animated background layer ---- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Mouse-following radial glow */}
        <div
          className="absolute w-[900px] h-[900px] rounded-full opacity-30 transition-all duration-[1200ms] ease-out"
          style={{
            left: `${mouse.x}%`,
            top: `${mouse.y}%`,
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
        {/* Floating orbs */}
        <div className="absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-primary/10 animate-float" style={{ filter: 'blur(60px)' }} />
        <div className="absolute top-[60%] right-[10%] w-96 h-96 rounded-full bg-primary/5 animate-float-delayed" style={{ filter: 'blur(80px)' }} />
        <div className="absolute bottom-[10%] left-[40%] w-64 h-64 rounded-full bg-primary/8 animate-pulse-glow" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ---- Top nav ---- */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 md:px-12 md:py-6 max-w-7xl mx-auto">
        <span className="text-base font-bold tracking-tight text-foreground select-none">
          Resume&thinsp;Enhancer
        </span>
        <AnimatedThemeToggler
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:scale-110 active:scale-95"
        />
      </nav>

      {/* ---- Hero content ---- */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-12 pb-16 md:pt-20 md:pb-24 max-w-5xl mx-auto text-center">
        {/* Animated pill badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-5 py-2 mb-10 backdrop-blur-sm"
          style={{
            opacity: reveal ? 1 : 0,
            transform: reveal ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
            backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)',
          }}
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
          <AnimatedShinyText className="text-xs font-semibold uppercase tracking-widest">
            AI-Powered Resume Builder
          </AnimatedShinyText>
        </div>

        {/* Main headline — LineShadowText */}
        <h1 className="relative">
          <span
            className="block text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tighter leading-[1.05] text-foreground"
            style={{
              opacity: reveal ? 1 : 0,
              transform: reveal
                ? 'translateY(0) rotateX(0deg)'
                : 'translateY(30px) rotateX(12deg)',
              filter: reveal ? 'blur(0)' : 'blur(8px)',
              transition: 'all 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s',
            }}
          >
            <LineShadowText
              shadowColor="hsl(var(--primary))"
              className="italic"
            >
              {t('home.brandLine1')}
            </LineShadowText>
          </span>
          <span
            className="block mt-2 text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tighter leading-[1.05] text-primary"
            style={{
              opacity: reveal ? 1 : 0,
              transform: reveal
                ? 'translateY(0) rotateX(0deg)'
                : 'translateY(30px) rotateX(12deg)',
              filter: reveal ? 'blur(0)' : 'blur(8px)',
              transition: 'all 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.35s',
            }}
          >
            <LineShadowText
              shadowColor="hsl(var(--foreground))"
              className="italic"
            >
              {t('home.brandLine2')}
            </LineShadowText>
          </span>
        </h1>

        {/* Subtitle — Highlighter */}
        <p
          className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed font-light"
          style={{
            opacity: reveal ? 1 : 0,
            transform: reveal ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.5s',
          }}
        >
          <Highlighter
            action="highlight"
            color="hsl(var(--primary) / 0.15)"
            strokeWidth={2}
            animationDuration={800}
            isView
          >
            {t('dashboard.subtitle')}
          </Highlighter>
        </p>

        {/* CTAs */}
        <div
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
          style={{
            opacity: reveal ? 1 : 0,
            transform: reveal ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.65s',
          }}
        >
          <Link
            href="/login"
            className="group relative inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.98]"
          >
            <span className="relative z-10">{t('home.launchApp')}</span>
            <ArrowRight className="h-4 w-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
            {/* Glow underlay */}
            <span className="absolute inset-0 rounded-xl bg-primary opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm px-8 py-3.5 text-sm font-semibold text-card-foreground transition-all duration-300 hover:bg-accent hover:border-primary/30 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Settings className="h-4 w-4" />
            {t('nav.settings')}
          </Link>
        </div>
      </div>

      {/* ---- Stats bar ---- */}
      <div
        ref={statsSection.ref}
        className="relative z-10 max-w-4xl mx-auto px-6"
      >
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 py-8 border-y border-border/40"
          style={{
            opacity: statsSection.inView ? 1 : 0,
            transform: statsSection.inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {[
            { value: counter1.value, suffix: '%', label: 'ATS-Friendly' },
            { value: counter2.value, suffix: 'K+', label: 'Resumes Built' },
            { value: counter3.value, suffix: 's', label: 'Avg. Tailor Time' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {stat.value}
                <span className="text-primary">{stat.suffix}</span>
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Feature cards ---- */}
      <div
        ref={cardsSection.ref}
        className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-20 md:pb-28"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              href: '/login',
              icon: FileText,
              title: t('nav.dashboard'),
              desc: 'Manage and organize all your resumes in one place',
              accent: 'from-primary/20 to-primary/5',
            },
            {
              href: '/login',
              icon: Target,
              title: t('nav.tailor'),
              desc: 'AI-powered tailoring matched to any job description',
              accent: 'from-primary/25 to-primary/5',
            },
            {
              href: '/login',
              icon: Zap,
              title: t('nav.builder'),
              desc: 'Build beautiful, professional resumes instantly',
              accent: 'from-primary/20 to-primary/5',
            },
          ].map((card, i) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-7 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/30"
              style={{
                opacity: cardsSection.inView ? 1 : 0,
                transform: cardsSection.inView
                  ? 'translateY(0)'
                  : 'translateY(30px)',
                transition: `all 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 + i * 0.15}s`,
              }}
            >
              {/* Hover gradient overlay */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.accent} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
              />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center mb-5 transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-110 group-hover:border-primary/20">
                  <card.icon className="h-5 w-5 text-primary transition-transform duration-500 group-hover:scale-110" />
                </div>
                <h3 className="text-lg font-bold text-card-foreground mb-2 tracking-tight">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {card.desc}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary opacity-0 translate-x-[-8px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                  Explore
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ---- Footer links ---- */}
      <div className="relative z-10 flex items-center justify-center gap-6 pb-12 text-xs text-muted-foreground">
        <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        <span className="text-border">|</span>
        <Link href="/terms-of-service" className="hover:text-foreground transition-colors">
          Terms of Service
        </Link>
      </div>

      {/* ---- Bottom fade ---- */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
    </section>
  );
}
