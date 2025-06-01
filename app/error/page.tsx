'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Wifi, RefreshCw, LockKeyhole, Database, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from 'next/navigation';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const errorType = searchParams?.get('type') || 'auth';
  const errorMessage = searchParams?.get('message');
  
  const getErrorIcon = () => {
    switch(errorType) {
      case 'connection': return <Wifi className="h-12 w-12" />;
      case 'auth': return <LockKeyhole className="h-12 w-12" />;
      case 'database': return <Database className="h-12 w-12" />;
      case 'validation': return <AlertTriangle className="h-12 w-12" />;
      default: return <AlertCircle className="h-12 w-12" />;
    }
  };
  
  const getErrorTitle = () => {
    switch(errorType) {
      case 'connection': return "Lỗi Kết Nối";
      case 'auth': return "Lỗi Xác Thực";
      case 'database': return "Lỗi Cơ Sở Dữ Liệu";
      case 'validation': return "Dữ Liệu Không Hợp Lệ";
      default: return "Đã Xảy Ra Lỗi";
    }
  };
  
  const getDefaultMessage = () => {
    switch(errorType) {
      case 'connection': return "Vui lòng kiểm tra kết nối internet và thử lại.";
      case 'auth': return "Phiên đăng nhập của bạn không hợp lệ hoặc đã hết hạn.";
      case 'database': return "Không thể truy cập hoặc cập nhật cơ sở dữ liệu.";
      case 'validation': return "Thông tin nhập vào không hợp lệ. Vui lòng kiểm tra lại.";
      default: return "Đã xảy ra sự cố. Vui lòng thử lại sau.";
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-red-500">
            {getErrorIcon()}
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            {getErrorTitle()}
          </CardTitle>
          <CardDescription>
            {errorMessage || getDefaultMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {errorType === 'connection' 
              ? "Vui lòng kiểm tra kết nối internet và thử lại." 
              : "Vui lòng thử lại hoặc liên hệ hỗ trợ nếu sự cố vẫn tiếp diễn."}
          </p>
          <div className="space-y-2">
            {errorType === 'connection' && (
              <Button className="w-full mb-2" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Thử Lại
              </Button>
            )}
            <Link href="/login">
              <Button variant={errorType === 'connection' ? "outline" : "default"} className="w-full">
                Quay Lại Đăng Nhập
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
