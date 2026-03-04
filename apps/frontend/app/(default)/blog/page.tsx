import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const posts = [
  {
    title: 'How to Beat ATS Systems in 2026',
    excerpt:
      'Learn the key strategies to ensure your resume passes automated screening every time.',
    date: 'Coming Soon',
    tag: 'Strategy',
  },
  {
    title: 'The Art of Quantifying Achievements',
    excerpt: 'Turn vague responsibilities into compelling, metric-driven bullet points.',
    date: 'Coming Soon',
    tag: 'Writing',
  },
  {
    title: 'AI-Powered Resume Tailoring Explained',
    excerpt: 'A deep dive into how Resume Enhancer uses AI to customize your resume for each role.',
    date: 'Coming Soon',
    tag: 'Product',
  },
];

export default function BlogPage() {
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
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Blog</h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Insights on resume strategy, career growth, and product updates.
        </p>

        <div className="mt-12 space-y-4">
          {posts.map((post) => (
            <div
              key={post.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                  {post.tag}
                </span>
                <span className="text-xs text-muted-foreground">{post.date}</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground">{post.excerpt}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Read more <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
