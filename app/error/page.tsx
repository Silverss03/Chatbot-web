'use client';

import { Suspense } from 'react';
import { Card } from "@/components/ui/card";
import { ErrorContent } from '@/components/ErrorContent';

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-pulse">Loading error details...</div>
        </Card>
      }>
        <ErrorContent />
      </Suspense>
    </div>
  )
}
