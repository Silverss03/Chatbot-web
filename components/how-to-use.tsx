import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Play, Users, Zap } from "lucide-react"

const guides = [
  {
    id: 1,
    title: "Getting Started",
    description: "Learn the basics and set up your account",
    difficulty: "Beginner",
    duration: "5 min",
    icon: Play,
  },
  {
    id: 2,
    title: "Advanced Features",
    description: "Explore powerful tools and customization options",
    difficulty: "Intermediate",
    duration: "15 min",
    icon: Zap,
  },
  {
    id: 3,
    title: "Team Collaboration",
    description: "Work effectively with your team members",
    difficulty: "Intermediate",
    duration: "10 min",
    icon: Users,
  },
  {
    id: 4,
    title: "Best Practices",
    description: "Tips and tricks from experienced users",
    difficulty: "Advanced",
    duration: "20 min",
    icon: BookOpen,
  },
]

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Beginner":
      return "bg-green-100 text-green-800"
    case "Intermediate":
      return "bg-yellow-100 text-yellow-800"
    case "Advanced":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function HowToUse() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          How to Use
        </CardTitle>
        <CardDescription>Step-by-step guides to help you get the most out of our platform</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {guides.map((guide) => {
          const IconComponent = guide.icon
          return (
            <div key={guide.id} className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <IconComponent className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{guide.title}</h4>
                    <span className="text-sm text-muted-foreground">{guide.duration}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{guide.description}</p>
                  <Badge className={getDifficultyColor(guide.difficulty)}>{guide.difficulty}</Badge>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
