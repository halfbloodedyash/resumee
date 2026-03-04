import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Github } from 'lucide-react';

export default function ContactUsPage() {
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
          Contact Us
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Have a question, feature request, or want to contribute? Reach out through any of these
          channels.
        </p>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: Mail,
              title: 'Email',
              desc: 'support@resumematcher.dev',
              href: 'mailto:support@resumematcher.dev',
            },
            {
              icon: Github,
              title: 'GitHub',
              desc: 'Open an issue or PR',
              href: 'https://github.com',
            },
            {
              icon: MessageSquare,
              title: 'Discussions',
              desc: 'Join the community',
              href: 'https://github.com',
            },
          ].map((ch) => (
            <a
              key={ch.title}
              href={ch.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-border bg-card p-6 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <ch.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-card-foreground mb-1">{ch.title}</h3>
              <p className="text-sm text-muted-foreground">{ch.desc}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
