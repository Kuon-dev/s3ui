import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'zh'],
  
  // The default locale if no match
  defaultLocale: 'en',
  
  // Disable automatic locale detection based on Accept-Language
  // We'll use localStorage instead for desktop app
  localeDetection: false
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(en|zh)/:path*']
};