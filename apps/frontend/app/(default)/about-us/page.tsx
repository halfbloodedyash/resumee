import Link from 'next/link';
import { ArrowLeft, Users, Sparkles, Target } from 'lucide-react';

export default function AboutUsPage() {
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
          About Us
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Resume Enhancer is an AI-powered platform that helps job seekers craft tailored,
          ATS-friendly resumes. We combine modern design with intelligent content optimization to
          give you the best chance at landing your dream role.
        </p>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              title: 'Our Mission',
              desc: 'Democratize access to professional-quality resume building for everyone.',
            },
            {
              icon: Sparkles,
              title: 'AI-Powered',
              desc: 'Multi-provider AI support for intelligent content refinement and tailoring.',
            },
            {
              icon: Target,
              title: 'ATS-Optimized',
              desc: 'Every resume is built to pass applicant tracking systems with confidence.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-card-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
