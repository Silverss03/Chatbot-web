import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Star } from "lucide-react"

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["Basic features", "Limited usage (10 messages perday)"],
    current: true,
    popular: false,
  },
  {
    name: "Pro",
    price: "$4.99",
    period: "month",
    features: ["All basic features", "Better usage(50 messages)", "Priority support"],
    current: false,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$19.99",
    period: "month",
    features: ["All pro features", "Unlimited usage"],
    current: false,
    popular: false,
  },
]

export function Subscription() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Subscription Plans
        </CardTitle>
        <CardDescription>Choose the plan that best fits your needs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {plans.map((plan) => (
          <div key={plan.name} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{plan.name}</h4>
                {plan.popular && (
                  <Badge className="bg-orange-100 text-orange-800">
                    <Star className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                )}
                {plan.current && <Badge variant="secondary">Current Plan</Badge>}
              </div>
              <div className="text-right">
                <div className="font-bold">{plan.price}</div>
                <div className="text-sm text-muted-foreground">/{plan.period}</div>
              </div>
            </div>

            <ul className="space-y-1">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <Check className="h-3 w-3 mr-2 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button variant={plan.current ? "secondary" : "default"} className="w-full" disabled={plan.current}>
              {plan.current ? "Current Plan" : "Upgrade"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
