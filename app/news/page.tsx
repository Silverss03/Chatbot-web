import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"

export default async function NewsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Quay Lại Trò Chuyện
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Tin Tức Mới Nhất</h1>
          <p className="text-gray-500 mt-1">Cập nhật các tính năng và thông tin mới nhất của chúng tôi</p>
        </div>

        <div className="space-y-6">
          {/* News items */}
          <Card>
            <CardHeader>
              <CardTitle>Ra Mắt Mô Hình AI Mới</CardTitle>
              <CardDescription>Ngày 12 tháng 6, 2023</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Chúng tôi vừa nâng cấp trợ lý AI với một mô hình ngôn ngữ mới, cung cấp các câu trả lời chính xác và hữu ích hơn.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tính Năng Ra Lệnh Bằng Giọng Nói Sắp Ra Mắt</CardTitle>
              <CardDescription>Ngày 5 tháng 6, 2023</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Trong bản cập nhật tiếp theo, bạn sẽ có thể nói chuyện trực tiếp với trợ lý AI. Hãy đón đợi tính năng thú vị này!</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thử Nghiệm Ứng Dụng Di Động</CardTitle>
              <CardDescription>Ngày 28 tháng 5, 2023</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Tham gia chương trình thử nghiệm beta cho ứng dụng di động sắp ra mắt. Nhận quyền truy cập sớm và giúp chúng tôi cải thiện!</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
