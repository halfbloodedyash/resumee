import Link from 'next/link';
import { ArrowLeft, FileText, Sparkles, Zap, PenTool } from 'lucide-react';

export default function OurWorkPage() {
  const features = [
    {
      icon: FileText,
      title: 'Resume Builder',
      desc: 'A structured builder with real-time preview, custom sections, and Swiss-style templates.',
    },
    {
      icon: Sparkles,
      title: 'AI Tailoring',
      desc: 'Match your resume to any job description with multi-provider AI analysis and refinement.',
    },
    {
      icon: Zap,
      title: 'Instant PDF Export',
      desc: 'Headless Chromium-powered PDF generation with pixel-perfect template rendering.',
    },
    {
      icon: PenTool,
      title: 'Content Enrichment',
      desc: 'AI-guided wizard to strengthen bullet points, quantify achievements, and fill gaps.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 flex items-center gap-4 px-6 py-4 md:px-8 bg-background/80 backdrop-blur-md border-b border-border/40">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </nav>

      <section className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Our Work
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          We build tools that make resume crafting faster, smarter, and more effective. Here&apos;s
          what powers Resume Enhancer.
        </p>

        <div className="mt-12 space-y-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-5 rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
