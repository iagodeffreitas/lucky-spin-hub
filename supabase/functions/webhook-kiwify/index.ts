import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-signature",
};

interface KiwifyWebhook {
  order_id: string;
  order_status: string;
  product_id?: string;
  Customer?: {
    email?: string;
    full_name?: string;
  };
  Subscription?: {
    id?: string;
  };
  order_ref?: string;
  sale_type?: string;
  payment_method?: string;
  created_at?: string;
  approved_date?: string;
  total?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: KiwifyWebhook = await req.json();
    console.log("Webhook Kiwify received:", JSON.stringify(body));

    // Kiwify order status check
    // approved, refunded, waiting_payment, refused, chargeback
    if (body.order_status === "paid" || body.order_status === "approved") {
      const orderId = body.order_id || body.order_ref;
      
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: "Order ID not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const email = body.Customer?.email || `customer_${orderId}@kiwify.com`;
      const name = body.Customer?.full_name || null;

      // Check if purchase already exists
      const { data: existing } = await supabase
        .from("purchases")
        .select("id")
        .eq("external_id", `kiwify_${orderId}`)
        .single();

      if (!existing) {
        // Create new purchase
        const { data, error } = await supabase.from("purchases").insert({
          user_email: email,
          user_name: name,
          external_id: `kiwify_${orderId}`,
          payment_platform: "kiwify",
          amount: body.total,
          status: "confirmed",
          spins_remaining: 5,
        }).select("access_token").single();

        if (error) {
          console.error("Error creating purchase:", error);
          return new Response(
            JSON.stringify({ error: "Failed to create purchase" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Purchase created successfully:", data);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Purchase created",
            redirect_url: `${req.headers.get("origin") || ""}/?token=${data.access_token}`
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Purchase already exists" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle refund/chargeback - could optionally disable spins
    if (body.order_status === "refunded" || body.order_status === "chargeback") {
      const orderId = body.order_id || body.order_ref;
      
      if (orderId) {
        await supabase
          .from("purchases")
          .update({ status: body.order_status, spins_remaining: 0 })
          .eq("external_id", `kiwify_${orderId}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
