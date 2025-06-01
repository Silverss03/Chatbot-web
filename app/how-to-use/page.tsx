import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, MessageSquare, FileText, Image, Settings } from "lucide-react"

export default async function HowToUsePage() {
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
              Quay lại Chatbot
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Cách Sử Dụng</h1>
          <p className="text-gray-500 mt-1">Tìm hiểu cách tận dụng tối đa trợ lý AI của bạn</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
                Trò Chuyện Cơ Bản
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Để trò chuyện với trợ lý AI, bạn chỉ cần nhập tin nhắn vào ô nhập liệu ở dưới cùng của giao diện chat và nhấn Enter. AI sẽ phản hồi ngay lập tức.</p>
              <p>Hãy thử đặt câu hỏi, yêu cầu thông tin, hoặc chỉ đơn giản là trò chuyện thân thiện.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-500" />
                Phân Tích Tài Liệu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Bạn có thể tải lên tài liệu để phân tích bằng cách nhấp vào nút đính kèm trong giao diện trò chuyện. AI có thể tóm tắt tài liệu, trích xuất thông tin quan trọng và trả lời các câu hỏi về nội dung.</p>
              <p>Các định dạng tệp được hỗ trợ bao gồm PDF, DOCX và TXT.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Image className="h-5 w-5 mr-2 text-purple-500" />
                Hiểu Hình Ảnh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Chia sẻ hình ảnh với trợ lý AI của bạn để nhận mô tả, phân tích nội dung hình ảnh hoặc tạo ý tưởng sáng tạo dựa trên hình ảnh.</p>
              <p>AI có thể nhận dạng đồ vật, cảnh vật, văn bản trong hình ảnh và nhiều hơn nữa.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-orange-500" />
                Tùy Chỉnh Trải Nghiệm Của Bạn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Bạn có thể tùy chỉnh cách trợ lý AI phản hồi bằng cách điều chỉnh các cài đặt như độ dài phản hồi, giọng điệu và mức độ chuyên môn. Các cài đặt này có thể được truy cập thông qua biểu tượng bánh răng trong giao diện trò chuyện.</p>
              <p>Lưu cài đặt ưa thích của bạn dưới dạng hồ sơ để chuyển đổi nhanh chóng giữa các kiểu trò chuyện khác nhau.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
