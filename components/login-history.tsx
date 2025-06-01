import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { Clock, CheckCircle, XCircle, History } from "lucide-react"

interface LoginHistoryEntry {
  id: string
  user_id: string
  login_timestamp: string
  login_success: boolean
}

export async function LoginHistory() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch user's login history
  const { data: loginHistory } = await supabase
    .from("login_history")
    .select("*")
    .eq("user_id", user.id)
    .order("login_timestamp", { ascending: false })
    .limit(10)

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const loginTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - loginTime.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Vừa xong"
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`
    return `${Math.floor(diffInMinutes / 1440)} ngày trước`
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Lịch sử đăng nhập
        </CardTitle>
        <CardDescription>Hoạt động xác thực gần đây của bạn</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loginHistory && loginHistory.length > 0 ? (
          loginHistory.map((entry: LoginHistoryEntry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {entry.login_success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium">{entry.login_success ? "Đăng nhập thành công" : "Đăng nhập thất bại"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(entry.login_timestamp)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={entry.login_success ? "default" : "destructive"}>
                  {entry.login_success ? "Thành công" : "Thất bại"}
                </Badge>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {getTimeAgo(entry.login_timestamp)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2" />
            <p>Không có lịch sử đăng nhập</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
