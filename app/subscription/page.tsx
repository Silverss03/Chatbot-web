import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SubscriptionSuccessDialog } from "@/components/subscription/SuccessDialog"

// Format VND currency
const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default async function SubscriptionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user's current subscription and plan info
  const { data: subscription, error } = await supabase
    .from('user_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  // Fetch all available subscription plans
  const { data: allPlans, error: plansError } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price', { ascending: true });

  if (plansError) {
    console.error("Error fetching subscription plans:", plansError);
  }

  const plans = allPlans || [];
  
  // If no active subscription, check if we need to create one with existing Starter plan
  if (error) {
    // Find the starter plan (assuming it's the one with lowest price)
    const starterPlan = plans.length > 0 ? plans[0] : { id: "a0e1238a-4f59-4d7d-8e53-082b77868f1c" };
    
    // Create a default subscription
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan_id: starterPlan.id,
        start_date: new Date().toISOString(),
        is_active: true,
        messages_used: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (subError) {
      console.error("Error creating default subscription:", subError);
    } else {
      // Refresh the page to show the new subscription
      redirect('/subscription');
    }
  }
  
  // Current plan ID
  const currentPlanId = subscription?.subscription_plans?.id || "";
  // Message usage (if applicable)
  const messagesUsed = subscription?.messages_used || 0;
  const messageLimit = subscription?.subscription_plans?.message_limit || 10;
  const limitReached = messageLimit > 0 && messagesUsed >= messageLimit;

  // Handle plan upgrades/downgrades
  async function handlePlanChange(formData: FormData) {
    'use server';
    
    const planId = formData.get('plan_id') as string;
    const supabase = await createClient();
    
    // Verify the plan exists before changing
    const { data: newPlan } = await supabase
      .from('subscription_plans')
      .select('id, price, name')
      .eq('id', planId)
      .single();
      
    if (!newPlan) {
      console.error("Plan doesn't exist:", planId);
      return;
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    // Get current subscription to check if this is an upgrade
    const { data: currentSub } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(price)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
      
    const currentPrice = currentSub?.subscription_plans?.price || 0;
    
    // If upgrading to a paid plan with higher price, redirect to transaction page
    if (newPlan.price > 0 && newPlan.price > currentPrice) {
      redirect(`/transaction?plan_id=${planId}`);
    }
    
    // For downgrades or free plans, process immediately
    // Deactivate current subscription
    await supabase
      .from('user_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_active', true);
      
    // Create new subscription
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        start_date: new Date().toISOString(),
        is_active: true,
        messages_used: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error("Error creating subscription:", insertError);
    }
      
    redirect('/subscription');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Quay lại Trò Chuyện
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Gói Dịch Vụ</h1>
          <p className="text-gray-500 mt-1">Chọn gói dịch vụ phù hợp với bạn</p>
          
          {/* Show message usage ONLY if on Starter plan AND message limit is set */}
          {subscription?.subscription_plans?.name === 'Starter' && messageLimit > 0 && (
            <div className="mt-2">
              <Badge variant={limitReached ? "destructive" : "secondary"}>
                Tin nhắn: {messagesUsed}/{messageLimit}
                {limitReached && " - Đã đạt giới hạn!"}
              </Badge>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Dynamically generate plan cards */}
          {plans.map((plan) => {
            const isCurrentPlan = currentPlanId === plan.id;
            const isPopularPlan = plan.name === 'Standard'; // Assuming 'Standard' is the popular plan
            
            return (
              <Card 
                key={plan.id}
                className={`${isCurrentPlan ? "border-blue-300 shadow-md" : ""} 
                            ${isPopularPlan && !isCurrentPlan ? "border-blue-200 shadow-md" : ""}
                            min-w-[280px]`}
              >
                <CardHeader className={isPopularPlan ? "bg-blue-50 rounded-t-lg" : ""}>
                  {isPopularPlan && (
                    <div className="text-center text-blue-600 font-semibold mb-2">PHỔ BIẾN NHẤT</div>
                  )}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-3xl font-bold">
                    {formatVND(plan.price || 0)}
                    <span className="text-sm font-normal text-gray-500">/tháng</span>
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="mb-5 text-sm text-gray-600">{plan.description}</p>
                </CardContent>
                <CardFooter>
                  <form action={handlePlanChange} className="w-full">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <Button 
                      className="w-full" 
                      type="submit"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan}
                    >
                      {isCurrentPlan ? "Gói Hiện Tại" : (
                        plan.price > (subscription?.subscription_plans?.price || 0) ? 
                          "Nâng Cấp Ngay" : "Hạ Cấp"
                      )}
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Success Dialog - Now loaded from client component */}
      <SubscriptionSuccessDialog />
    </div>
  )
}
