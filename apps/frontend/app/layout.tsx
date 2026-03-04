import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './(default)/css/globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Resume Enhancer',
  description: 'Build your resume with Resume Enhancer',
  applicationName: 'Resume Enhancer',
  keywords: ['resume', 'enhancer', 'job', 'application'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geist.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-full`}
      >
        {children}
      </body>
    </html>
  );
}
