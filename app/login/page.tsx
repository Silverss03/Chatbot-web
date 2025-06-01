"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { signInWithGoogle, signInWithFacebook, signUpWithPhone, signInWithPhone } from "@/app/auth/actions"
import { Facebook, Mail, Phone, LogIn, UserPlus, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false)
  const [showCookieError, setShowCookieError] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if user was redirected from cookie reset
    const from = searchParams?.get('from')
    if (from === 'cookie-reset') {
      setShowCookieError(true)
    }
    
    // Check for authentication error
    const error = searchParams?.get('error')
    if (error) {
      setLoginError(error)
    }
  }, [searchParams])

  const handleOAuthSubmit = async (action: () => Promise<void>) => {
    setIsLoading(true)
    try {
      await action()
    } catch (error) {
      console.error("OAuth error:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleFormAction = async (action: any, formData: FormData) => {
    setIsLoading(true);
    setLoginError(null);
    
    try {
      // Use the modified action which returns an object instead of redirecting
      const result = await action(formData);
      
      if (result && result.redirectTo) {
        // Client-side redirect instead of server redirect
        if (result.success) {
          router.push(result.redirectTo);
        } else {
          // For errors, extract any message from the URL
          const url = new URL(result.redirectTo, window.location.origin);
          const errorMessage = url.searchParams.get('message');
          if (errorMessage) {
            setLoginError(decodeURIComponent(errorMessage));
          }
          router.push(result.redirectTo);
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setLoginError("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome</CardTitle>
          <CardDescription className="text-center">Đăng nhập hoặc tạo tài khoản mới</CardDescription>
          
          {showCookieError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Lỗi Xác thực</AlertTitle>
              <AlertDescription>
                Phiên đăng nhập của bạn đã bị hỏng. Vui lòng đăng nhập lại.
              </AlertDescription>
            </Alert>
          )}
          
          {loginError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {loginError}
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* OAuth Providers */}
          <div className="space-y-2">
            <Button
              onClick={() => handleOAuthSubmit(signInWithGoogle)}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <Mail className="mr-2 h-4 w-4" />
              Tiếp tục với Google
            </Button>

            <Button
              onClick={() => handleOAuthSubmit(signInWithFacebook)}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <Facebook className="mr-2 h-4 w-4" />
              Tiếp tục với Facebook
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Hoặc sử dụng số điện thoại</span>
            </div>
          </div>

          {/* Phone Authentication Tabs */}
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Đăng ký
              </TabsTrigger>
              <TabsTrigger value="signin" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="space-y-4">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFormAction(signUpWithPhone, new FormData(e.currentTarget));
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="signup-fullName">Họ và tên</Label>
                  <Input id="signup-fullName" name="fullName" type="text" placeholder="Nhập họ và tên của bạn" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="email@example.com" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Số điện thoại</Label>
                  <Input id="signup-phone" name="phone" type="tel" placeholder="+84..." required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mật khẩu</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="Tạo mật khẩu"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mật khẩu phải có ít nhất 6 ký tự
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Tạo tài khoản
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signin" className="space-y-4">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFormAction(signInWithPhone, new FormData(e.currentTarget));
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" name="email" type="email" placeholder="email@example.com" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-phone">Số điện thoại</Label>
                  <Input id="signin-phone" name="phone" type="tel" placeholder="+84..." required />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Mật khẩu</Label>
                    <Link href="/auth/recover" className="text-xs text-blue-600 hover:underline">
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="Nhập mật khẩu của bạn"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Đăng nhập
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
