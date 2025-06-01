"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";

interface PaymentStatusMonitorProps {
  transactionRef: string;
  planName: string;
}

export function PaymentStatusMonitor({ transactionRef, planName }: PaymentStatusMonitorProps) {
  const [status, setStatus] = useState<'pending' | 'completed' | 'error'>('pending');
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const router = useRouter();
  
  useEffect(() => {
    const supabase = createClient();
    let timer: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;
    
    // Set up subscription to payment_transactions table for real-time updates
    const subscription = supabase
      .channel('payment-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_transactions',
          filter: `reference=eq.${transactionRef}`
        },
        (payload) => {
          if (payload.new.status === 'completed') {
            setStatus('completed');
            setShowDialog(true);
            clearInterval(intervalId);
          }
        }
      )
      .subscribe();
    
    // Poll for status updates as backup
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_transactions')
          .select('status')
          .eq('reference', transactionRef)
          .single();
        
        if (error) {
          console.error("Error checking payment status:", error);
          return;
        }
        
        if (data.status === 'completed') {
          setStatus('completed');
          setShowDialog(true);
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Exception checking payment status:", err);
      }
    };
    
    // Check every 10 seconds
    intervalId = setInterval(() => {
      checkStatus();
      setElapsedTime(prev => prev + 10);
    }, 10000);
    
    // Initial check
    checkStatus();
    
    // Auto-redirect if taking too long (5 minutes)
    timer = setTimeout(() => {
      if (status === 'pending') {
        router.push(`/subscription?check=${transactionRef}`);
      }
    }, 5 * 60 * 1000);
    
    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
      clearTimeout(timer);
    };
  }, [transactionRef, router, status]);
  
  const handleCloseDialog = () => {
    setShowDialog(false);
    router.push('/subscription');
  };
  
  const handleGotoHome = () => {
    setShowDialog(false);
    router.push('/');
  };
  
  return (
    <>
      {status === 'pending' && (
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="animate-spin h-4 w-4" />
          <p>Đang chờ xác nhận thanh toán...</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <p>{error || "Đã xảy ra lỗi khi kiểm tra trạng thái thanh toán"}</p>
        </div>
      )}
      
      {/* Success Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 bg-green-100 p-3 rounded-full">
              <PartyPopper className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl text-center">Thanh Toán Thành Công!</DialogTitle>
            <DialogDescription className="text-center pt-2">
              <p>Chúng tôi đã nhận được thanh toán của bạn cho gói <span className="font-bold">{planName}</span></p>
              <p className="mt-2">Tài khoản của bạn đã được nâng cấp và bạn có thể sử dụng các tính năng mới ngay bây giờ.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row sm:justify-center gap-2">
            <Button onClick={handleCloseDialog}>
              Xem Gói Dịch Vụ
            </Button>
            <Button variant="outline" onClick={handleGotoHome}>
              Về Trang Chủ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
