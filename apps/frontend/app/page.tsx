import Hero from '@/components/home/hero';
import { LanguageProvider } from '@/lib/context/language-context';
import { ThemeProvider } from '@/components/common/theme-provider';

export default function Home() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Hero />
      </LanguageProvider>
    </ThemeProvider>
  );
}
