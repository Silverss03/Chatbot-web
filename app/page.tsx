import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChatInterface } from "@/components/ChatInterface"
import { LogOut, User, Newspaper, CreditCard, HelpCircle } from "lucide-react"
import Link from "next/link"

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Determine display name and identifier
  const displayName = profile?.full_name || "User"
  const displayIdentifier = profile?.phone || profile?.email || user.email

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-gray-700">
                Trợ Lý AI
              </Link>
              
              {/* Navigation Links */}
              <nav className="hidden md:flex items-center space-x-6">
                <Link 
                  href="/news" 
                  className="text-gray-600 hover:text-gray-900 flex items-center gap-1.5 text-sm font-medium"
                >
                  <Newspaper className="h-4 w-4" />
                  Tin Tức
                </Link>
                <Link 
                  href="/subscription" 
                  className="text-gray-600 hover:text-gray-900 flex items-center gap-1.5 text-sm font-medium"
                >
                  <CreditCard className="h-4 w-4" />
                  Gói Dịch Vụ
                </Link>
                <Link 
                  href="/how-to-use" 
                  className="text-gray-600 hover:text-gray-900 flex items-center gap-1.5 text-sm font-medium"
                >
                  <HelpCircle className="h-4 w-4" />
                  Hướng Dẫn
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">{displayIdentifier}</p>
                </div>
              </div>

              <Link href="/auth/reset-cookies?redirect=/login">
                <Button variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng Xuất
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden border-b bg-white p-2">
        <div className="flex justify-around">
          <Link 
            href="/news" 
            className="text-gray-600 hover:text-gray-900 flex flex-col items-center p-2 text-xs"
          >
            <Newspaper className="h-5 w-5 mb-1" />
            Tin Tức
          </Link>
          <Link 
            href="/subscription" 
            className="text-gray-600 hover:text-gray-900 flex flex-col items-center p-2 text-xs"
          >
            <CreditCard className="h-5 w-5 mb-1" />
            Gói Dịch Vụ
          </Link>
          <Link 
            href="/how-to-use" 
            className="text-gray-600 hover:text-gray-900 flex flex-col items-center p-2 text-xs"
          >
            <HelpCircle className="h-5 w-5 mb-1" />
            Trợ Giúp
          </Link>
        </div>
      </div>

      {/* Main Content - Chatbot */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-sm border p-6 h-[calc(100vh-180px)] flex flex-col">
          <h2 className="text-2xl font-bold mb-6 text-center">Chào Mừng Đến Với Trợ Lý AI</h2>
          
          {/* Full-height chatbot */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  )
}