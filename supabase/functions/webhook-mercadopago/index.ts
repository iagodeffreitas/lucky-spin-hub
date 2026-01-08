import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MercadoPagoPayment {
  id: number;
  status: string;
  external_reference?: string;
  payer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  transaction_amount?: number;
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

    const body = await req.json();
    console.log("Webhook Mercado Pago received:", JSON.stringify(body));

    // Mercado Pago sends different types of notifications
    if (body.type === "payment" || body.action === "payment.created" || body.action === "payment.updated") {
      const paymentId = body.data?.id || body.id;
      
      if (!paymentId) {
        return new Response(
          JSON.stringify({ error: "Payment ID not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // In production, you would fetch payment details from Mercado Pago API
      // For now, we'll use the webhook data
      const payment: MercadoPagoPayment = body.data || body;
      
      if (payment.status === "approved") {
        const email = payment.payer?.email || `customer_${paymentId}@mercadopago.com`;
        const name = payment.payer?.first_name 
          ? `${payment.payer.first_name} ${payment.payer.last_name || ""}`.trim()
          : null;

        // Check if purchase already exists
        const { data: existing } = await supabase
          .from("purchases")
          .select("id")
          .eq("external_id", `mp_${paymentId}`)
          .single();

        if (!existing) {
          // Create new purchase
          const { data, error } = await supabase.from("purchases").insert({
            user_email: email,
            user_name: name,
            external_id: `mp_${paymentId}`,
            payment_platform: "mercado_pago",
            amount: payment.transaction_amount,
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
