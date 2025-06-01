'use client';

import { Suspense } from 'react';
import { Card } from "@/components/ui/card";
import { ErrorContent } from '@/components/ErrorContent';

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Suspense fallback={<ErrorFallback />}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}

// Separate fallback component to avoid rendering issues
function ErrorFallback() {
  return (
    <Card className="w-full max-w-md p-8 text-center">
      <div className="animate-pulse space-y-4">
        <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto"></div>
        <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-10 bg-gray-200 rounded w-full mt-4"></div>
      </div>
    </Card>
  );
}
