'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, MailCheck } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from 'next/navigation'

export default function SignupConfirmPage() {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-green-500">
            <MailCheck className="h-12 w-12" />
          </div>
          <CardTitle className="text-xl font-bold text-green-600">Xác nhận Email của bạn</CardTitle>
          <CardDescription className="mt-2">
            Chúng tôi đã gửi một email đến:
            <div className="font-medium mt-1 text-black">{email}</div>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Vui lòng kiểm tra hộp thư đến của bạn và nhấp vào liên kết xác nhận để hoàn tất quá trình đăng ký.
          </p>
          <p className="text-sm text-muted-foreground">
            Nếu bạn không thấy email trong hộp thư đến, hãy kiểm tra thư mục spam hoặc thử lại.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <Check className="mr-2 h-4 w-4" />
                Quay lại đăng nhập
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
