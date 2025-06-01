"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, PartyPopper } from "lucide-react";

export function SubscriptionSuccessDialog() {
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [upgradedPlan, setUpgradedPlan] = useState<{ name: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const checkTransactionRef = searchParams?.get('check');
  const txSuccess = searchParams?.get('success');
  const txPlanName = searchParams?.get('plan');
  
  useEffect(() => {
    const checkTransaction = async () => {
      if (checkTransactionRef) {
        try {
          const supabase = createClient();
          const { data: tx } = await supabase
            .from('payment_transactions')
            .select('*, subscription_plans:plan_id(*)')
            .eq('reference', checkTransactionRef)
            .single();
          
          if (tx && tx.status === 'completed') {
            // Transaction is completed - show success dialog
            setUpgradedPlan(tx.subscription_plans);
            setShowSuccessDialog(true);
            
            // Remove the check parameter to avoid showing dialog again on refresh
            router.replace('/subscription');
          }
        } catch (error) {
          console.error("Error checking transaction status:", error);
        }
      }
      
      // Check for success parameter (for webhook-based success notification)
      if (txSuccess === 'true' && txPlanName) {
        setUpgradedPlan({ name: txPlanName });
        setShowSuccessDialog(true);
        router.replace('/subscription');
      }
    };
    
    checkTransaction();
  }, [checkTransactionRef, txSuccess, txPlanName, router]);
  
  return (
    <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 bg-green-100 p-3 rounded-full">
            <PartyPopper className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl text-center">Nâng Cấp Thành Công!</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Bạn đã nâng cấp thành công lên gói <span className="font-bold">{upgradedPlan?.name || 'Pro'}</span>
            <p className="mt-2">Tài khoản của bạn đã được cập nhật và bạn có thể sử dụng các tính năng mới ngay bây giờ.</p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center mt-4">
          <Button onClick={() => setShowSuccessDialog(false)}>
            <Check className="mr-2 h-4 w-4" /> Đã Hiểu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { createClient } from "@/lib/supabase/client";
