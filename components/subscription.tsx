import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  duration_months: number
  message_limit: number
  created_at: string
}

interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  start_date: string
  end_date: string
  is_active: boolean
  messages_used: number
  created_at: string
  updated_at: string
}

export async function Subscription() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch subscription plans
  const { data: plans } = await supabase.from("subscription_plans").select("*").order("price", { ascending: true })

  // Fetch user's current subscription
  const { data: userSubscription } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user?.id)
    .eq("is_active", true)
    .single()

  const formatPrice = (price: number) => {
    return price === 0 ? "Free" : `$${price.toFixed(2)}`
  }

  const formatMessageLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : `${limit} messages`
  }

  const isCurrentPlan = (planId: string) => {
    return userSubscription?.plan_id === planId
  }

  const getMostPopularPlan = () => {
    // Assume the middle-priced plan is most popular
    if (plans && plans.length >= 2) {
      return plans[1].id
    }
    return null
  }

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
        {plans?.map((plan: SubscriptionPlan) => (
          <div key={plan.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{plan.name}</h4>
                {plan.id === getMostPopularPlan() && (
                  <Badge className="bg-orange-100 text-orange-800">
                    <Star className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                )}
                {isCurrentPlan(plan.id) && <Badge variant="secondary">Current Plan</Badge>}
              </div>
              <div className="text-right">
                <div className="font-bold">{formatPrice(plan.price)}</div>
                <div className="text-sm text-muted-foreground">
                  /{plan.duration_months === 1 ? "month" : `${plan.duration_months} months`}
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{plan.description}</p>

            <div className="flex items-center text-sm">
              <Check className="h-3 w-3 mr-2 text-green-500" />
              {formatMessageLimit(plan.message_limit)}
            </div>

            {userSubscription && isCurrentPlan(plan.id) && (
              <div className="text-xs text-muted-foreground">
                Messages used: {userSubscription.messages_used} / {formatMessageLimit(plan.message_limit)}
              </div>
            )}

            <Button
              variant={isCurrentPlan(plan.id) ? "secondary" : "default"}
              className="w-full"
              disabled={isCurrentPlan(plan.id)}
            >
              {isCurrentPlan(plan.id) ? "Current Plan" : "Upgrade"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
