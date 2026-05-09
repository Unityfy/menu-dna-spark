const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a culinary cost-engineering assistant for restaurants in India.
Given a dish name, return a structured analysis with realistic ingredient breakdown,
estimated quantities per single serving, current Indian wholesale market prices in INR,
preparation style, cuisine type, cooking complexity, and a complexity/effort score.

Use realistic per-serving portion sizes. Use current Indian market wholesale rates
(grocery + mandi prices). Cost is per the unit specified (e.g. INR per kg, per L, per pc).

Return ONLY valid JSON matching this schema, no prose:
{
  "dish_name": string,
  "cuisine": string,
  "prep_style": string,           // e.g. "Tandoor grilled", "Slow simmered curry"
  "complexity": "low" | "medium" | "high",
  "complexity_score": number,     // 1-10
  "estimated_prep_minutes": number,
  "ingredients": [
    {
      "name": string,
      "quantity": number,         // numeric portion per serving
      "unit": "g" | "kg" | "ml" | "L" | "pc",
      "unit_cost_inr": number,    // INR per (kg / L / pc) — base unit
      "line_cost_inr": number     // computed cost for this serving
    }
  ],
  "total_food_cost_inr": number,
  "notes": string
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { dish_name, category, cuisine_hint } = await req.json();
    if (!dish_name || typeof dish_name !== "string") {
      return new Response(JSON.stringify({ error: "dish_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Dish: ${dish_name}${category ? `\nCategory: ${category}` : ""}${cuisine_hint ? `\nRestaurant cuisine: ${cuisine_hint}` : ""}\n\nReturn the JSON analysis.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("OpenAI error:", data);
      return new Response(JSON.stringify({ error: data?.error?.message || "OpenAI request failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = data?.choices?.[0]?.message?.content;
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "AI returned invalid JSON", raw: content }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-dish error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
