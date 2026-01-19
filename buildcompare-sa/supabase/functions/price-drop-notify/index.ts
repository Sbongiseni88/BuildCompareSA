// Supabase Edge Function: Price Drop Notification
// Triggered when a price update is detected that is lower than the user's alert threshold

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// interface PriceAlert {
//     id: string;
//     user_id: string;
//     material_name: string;
//     target_price: number;
//     current_price: number;
//     email: string;
// }

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Get request body (triggered by database webhook or cron)
        const { material_name, new_price, old_price } = await req.json();

        // Only proceed if price dropped
        if (new_price >= old_price) {
            return new Response(
                JSON.stringify({ message: "No price drop detected" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const priceDropPercent = ((old_price - new_price) / old_price * 100).toFixed(1);

        // Find users with price alerts for this material
        const { data: alerts, error } = await supabaseClient
            .from("price_alerts")
            .select("id, user_id, material_name, target_price, users(email)")
            .eq("material_name", material_name)
            .gte("target_price", new_price)
            .eq("active", true);

        if (error) throw error;

        if (!alerts || alerts.length === 0) {
            return new Response(
                JSON.stringify({ message: "No matching alerts found" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Send notifications (using Supabase's built-in email or external service)
        const notifications = [];

        for (const alert of alerts) {
            // Log notification to database
            const { error: insertError } = await supabaseClient
                .from("notifications")
                .insert({
                    user_id: alert.user_id,
                    type: "price-drop",
                    title: `Price Drop Alert: ${material_name}`,
                    message: `${material_name} dropped ${priceDropPercent}% from R${old_price} to R${new_price}!`,
                    read: false,
                });

            if (!insertError) {
                notifications.push({
                    user_id: alert.user_id,
                    material: material_name,
                    new_price,
                    drop_percent: priceDropPercent,
                });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                notifications_sent: notifications.length,
                details: notifications,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
