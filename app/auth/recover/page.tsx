'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function RecoverPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClientComponentClient()
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      
      if (error) {
        setError(error.message)
      } else {
        setIsSuccess(true)
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi xử lý yêu cầu của bạn.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Quay lại đăng nhập
            </Link>
          </div>
          <CardTitle className="mt-4 text-2xl font-bold text-center">Khôi phục mật khẩu</CardTitle>
          <CardDescription className="text-center">
            Nhập email của bạn và chúng tôi sẽ gửi cho bạn một liên kết để đặt lại mật khẩu
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isSuccess ? (
            <div className="text-center">
              <div className="mb-4 rounded-full bg-green-100 p-3 text-green-600 w-16 h-16 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8" />
              </div>
              
              <h3 className="text-lg font-medium text-green-600 mb-2">Email đã được gửi!</h3>
              <p className="text-muted-foreground mb-4">
                Kiểm tra hộp thư đến email của bạn để được hướng dẫn đặt lại mật khẩu.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">Quay lại đăng nhập</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  type="email" 
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Đang xử lý...' : 'Gửi liên kết đặt lại'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
