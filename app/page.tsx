import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function RootPage() {
  // Get the preferred locale from headers or default to 'en'
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  
  // Simple locale detection
  let locale = 'en';
  if (acceptLanguage.includes('zh')) locale = 'zh';
  
  redirect(`/${locale}`);
}