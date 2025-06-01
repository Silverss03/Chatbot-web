import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers";
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, AlertTriangle } from "lucide-react"
import { CopyButton } from "@/components/CopyButton"

// Format VND currency
const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper function to get Vietnam timezone (UTC+7) timestamp
const getVietnamTimestamp = () => {
  const now = new Date();
  // Add 7 hours to get Vietnam time (UTC+7)
  const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return vietnamTime.toISOString();
};

// Helper function for handling database errors
const handleDatabaseError = (error: any) => {
  console.error("Database error:", error);
  if (error.message?.includes("Invalid API key")) {
    console.error("API key issue detected. Please check your environment configuration.");
  }
};

export default async function TransactionPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const params = await searchParams;
  const planId = params.plan_id as string;
  
  if (!planId) {
    redirect("/subscription")
  }
  
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }
  
  // Get plan details
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();
    
  if (planError || !plan) {
    handleDatabaseError(planError);
    redirect("/subscription")
  }
  
  // Generate a transaction reference
  const transactionRef = `TXN-${Date.now()}-${user.id.slice(0, 8)}`;
  let transactionCreated = false;
  
  // Store the transaction reference in the database for later matching with webhook
  try {
    const { error: txnError } = await supabase
      .from('payment_transactions')
      .insert({
        reference: transactionRef,
        user_id: user.id,
        plan_id: planId,
        amount: plan.price || 0,
        status: 'pending',
        created_at: getVietnamTimestamp()
      });
    
    if (txnError) {
      handleDatabaseError(txnError);
      // Continue anyway - not critical for page to work
    } else {
      transactionCreated = true;
    }
  } catch (e) {
    console.error("Failed to store transaction reference:", e);
    // Continue without storing reference
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/subscription">
            <Button variant="outline" size="sm" className="mb-4">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Quay lại Gói Dịch Vụ
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Hoàn Tất Thanh Toán</h1>
          <p className="text-gray-500 mt-1">Quét mã QR để nâng cấp lên {plan.name}</p>
          
          {!transactionCreated && (
            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200">
              Lưu ý: Đã xảy ra sự cố khi lưu mã giao dịch của bạn. Quá trình thanh toán có thể mất nhiều thời gian hơn bình thường.
            </div>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Chi Tiết Thanh Toán</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="mb-6 border-2 border-gray-200 p-2 rounded-md">
              <Image 
                src={`/QR_Code.png?ref=${transactionRef}&plan=${plan.id}`}
                alt="Mã QR Thanh Toán" 
                width={300} 
                height={300} 
                className="mx-auto"
              />
            </div>
            
            <div className="w-full space-y-2 text-center mb-4">
              <div>
                <span className="text-gray-500">Gói:</span>
                <span className="font-semibold ml-2">{plan.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Số tiền:</span>
                <span className="font-semibold ml-2">{formatVND(plan.price || 0)}</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-gray-500">Mã giao dịch:</span>
                <span className="font-semibold ml-2 mr-1">{transactionRef}</span>
                <CopyButton text={transactionRef} />
              </div>
            </div>
            
            <div className="flex items-start p-4 bg-amber-50 text-amber-800 rounded-md mt-4 w-full">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold mb-1">QUAN TRỌNG: Hướng Dẫn Thanh Toán</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Sao chép mã giao dịch phía trên: <strong>{transactionRef}</strong></li>
                  <li><strong className="text-red-600">BẠN PHẢI nhập mã này</strong> vào mục mô tả/nội dung khi chuyển khoản</li>
                  <li>Hoàn tất chuyển khoản với số tiền chính xác: {formatVND(plan.price || 0)}</li>
                </ol>
                <p className="mt-2 font-medium">Không có mã này, giao dịch của bạn không thể được xử lý tự động.</p>
              </div>
            </div>
            
            {/* Example of properly formatted transfer */}
            <div className="w-full mt-4 p-3 bg-blue-50 text-blue-800 rounded-md">
              <p className="font-bold mb-2 text-sm">Ví dụ mô tả thanh toán đúng cách:</p>
              <div className="bg-white p-2 rounded border border-blue-200">
                <p className="font-mono text-sm break-all">{transactionRef} NANG CAP LEN {plan.name.toUpperCase()}</p>
              </div>
              <p className="text-xs mt-2">Mã giao dịch phải được nhập chính xác như trên.</p>
            </div>
            
            {/* Add status checker */}
            <div className="w-full mt-6 text-center">
              <p className="text-sm text-gray-500 mb-2">Sau khi thanh toán, vui lòng chờ vài phút để hệ thống xử lý.</p>
              <Button asChild variant="outline" className="mx-auto">
                <Link href={`/subscription?check=${transactionRef}`}>Kiểm Tra Trạng Thái Thanh Toán</Link>
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/">Trở Về Trang Chủ</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
