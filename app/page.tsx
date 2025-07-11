'use client';

import { FileBrowser } from '@/components/r2/file-browser';
import { ErrorBoundary } from '@/components/error-boundary';
import { useEffect, useState } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden animate-fade-in">
      <ErrorBoundary>
        <FileBrowser />
      </ErrorBoundary>
    </div>
  );
}