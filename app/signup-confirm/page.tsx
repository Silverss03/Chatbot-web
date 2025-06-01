'use client'

import { Suspense } from 'react';
import { Card } from "@/components/ui/card";
import { SignupConfirmContent } from '@/components/SignupConfirmContent';

export default function SignupConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Suspense fallback={<LoadingCard />}>
        <SignupConfirmContent />
      </Suspense>
    </div>
  );
}

// Fallback loading component
function LoadingCard() {
  return (
    <Card className="w-full max-w-md p-8 text-center">
      <div className="animate-pulse space-y-4">
        <div className="h-12 w-12 bg-blue-200 rounded-full mx-auto"></div>
        <div className="h-6 bg-blue-200 rounded w-3/4 mx-auto"></div>
        <div className="h-4 bg-blue-200 rounded w-full"></div>
        <div className="h-10 bg-blue-200 rounded w-full mt-4"></div>
      </div>
    </Card>
  );
}
