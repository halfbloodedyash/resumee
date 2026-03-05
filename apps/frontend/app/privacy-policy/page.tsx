import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Resume Enhancer',
  description: 'Privacy Policy for Resume Enhancer.',
};

const policySections = [
  {
    title: 'Information We Collect',
    body: [
      'We collect the information you provide directly, such as resume uploads, job descriptions, account identifiers, and configuration preferences.',
      'We may also collect technical metadata needed to operate the service, including device, browser, and usage telemetry.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'We use your information to provide core features such as resume parsing, tailoring, PDF generation, and account-level settings.',
      'We may use aggregated or de-identified data to improve service quality, reliability, and performance.',
    ],
  },
  {
    title: 'AI Processing and Third-Party Providers',
    body: [
      'When AI features are used, relevant content may be processed by selected model providers to generate outputs.',
      'You are responsible for ensuring the content you submit is appropriate for processing under your compliance requirements.',
    ],
  },
  {
    title: 'Data Retention',
    body: [
      'We retain data for as long as needed to provide the service and maintain operational integrity.',
      'You may delete resume records and related artifacts through available product controls where supported.',
    ],
  },
  {
    title: 'Security',
    body: [
      'We implement reasonable technical safeguards to protect your data from unauthorized access or disclosure.',
      'No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    title: 'Your Choices',
    body: [
      'You can update or remove certain stored information from within the application where functionality is available.',
      'If you have a privacy request, contact us using the support channels listed in the product.',
    ],
  },
  {
    title: 'Policy Updates',
    body: [
      'We may revise this Privacy Policy from time to time. Material changes will be reflected on this page.',
      'Your continued use of the service after updates means you accept the revised policy.',
    ],
  },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F0F0E8] text-[#000000]">
      <nav className="border-b-2 border-black bg-[#F0F0E8]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="font-mono text-xs uppercase tracking-wider hover:underline"
          >
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy-policy"
              className="font-mono text-xs uppercase tracking-wider underline"
            >
              Privacy
            </Link>
            <Link
              href="/terms-of-service"
              className="font-mono text-xs uppercase tracking-wider hover:underline"
            >
              Terms
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <h1 className="font-serif text-4xl font-bold tracking-tight md:text-5xl">Privacy Policy</h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-[#4B5563]">
          Last updated: March 5, 2026
        </p>
        <p className="mt-6 max-w-3xl font-sans text-base leading-relaxed">
          This Privacy Policy explains how Resume Enhancer collects, uses, and protects information
          when you use the service.
        </p>

        <div className="mt-10 space-y-6">
          {policySections.map((section) => (
            <article
              key={section.title}
              className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000000]"
            >
              <h2 className="font-serif text-2xl font-semibold">{section.title}</h2>
              <div className="mt-4 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="font-sans text-sm leading-relaxed text-[#111111]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
