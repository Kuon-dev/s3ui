import { notFound } from 'next/navigation';
import { LocaleProvider } from '@/providers/locale-provider';
import { locales, getMessages, type Locale } from '@/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Load messages with error handling
  const messages = await getMessages(locale);

  return (
    <LocaleProvider 
      locale={locale} 
      messages={messages}
      timeZone="UTC"
      now={new Date()}
    >
      {children}
    </LocaleProvider>
  );
}