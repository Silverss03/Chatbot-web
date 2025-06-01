import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, TrendingUp } from "lucide-react"

const newsItems = [
  {
    id: 1,
    title: "New Feature Release: Enhanced Analytics",
    description: "We've launched advanced analytics to help you track your progress better.",
    category: "Product Update",
    time: "2 hours ago",
    trending: true,
  },
  {
    id: 2,
    title: "System Maintenance Scheduled",
    description: "Planned maintenance window this weekend to improve performance.",
    category: "Maintenance",
    time: "1 day ago",
    trending: false,
  },
  {
    id: 3,
    title: "Community Milestone: 10K Users!",
    description: "We've reached 10,000 active users. Thank you for being part of our journey.",
    category: "Milestone",
    time: "3 days ago",
    trending: true,
  },
]

export function News() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Latest News
        </CardTitle>
        <CardDescription>Stay updated with the latest announcements and updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newsItems.map((item) => (
          <div key={item.id} className="border-l-4 border-l-blue-500 pl-4 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={item.trending ? "default" : "secondary"}>{item.category}</Badge>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {item.time}
              </div>
            </div>
            <h4 className="font-semibold">{item.title}</h4>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
