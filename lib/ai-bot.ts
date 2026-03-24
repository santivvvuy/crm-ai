// ─── AI Bot — GPT-4 mini with tool calling ─────────────────────────────────
// Generates responses using OpenAI with a product search tool.

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { searchProducts } from "./product-search";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cache the prompt for 60 seconds to avoid hitting Supabase on every message
let cachedPrompt: string | null = null;
let promptCacheTime = 0;
const PROMPT_CACHE_TTL = 60 * 1000;

export async function getSystemPrompt(): Promise<string> {
  const now = Date.now();
  if (cachedPrompt && now - promptCacheTime < PROMPT_CACHE_TTL) {
    return cachedPrompt;
  }

  const { data, error } = await supabase
    .from("bot_settings")
    .select("system_prompt")
    .eq("id", 1)
    .single();

  if (error || !data?.system_prompt) {
    console.error("[AI Bot] Could not load system prompt from Supabase:", error);
    return cachedPrompt ?? "Eres el asistente virtual de MarketPhone.";
  }

  cachedPrompt = data.system_prompt ?? null;
  promptCacheTime = now;
  return cachedPrompt ?? "Eres el asistente virtual de MarketPhone.";
}

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "buscar_producto",
      description:
        "Busca un producto (celular, accesorio) en el catálogo de MarketPhone. Devuelve modelo, precio, colores y stock.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "El nombre del producto a buscar, por ejemplo: 'iPhone 15 Pro Max', 'Samsung S24', 'cargador'",
          },
        },
        required: ["query"],
      },
    },
  },
];

export async function generateBotResponse(
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<string> {
  try {
    const systemPrompt = await getSystemPrompt();

    // Build messages array with history (last 10 messages for context)
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: "user", content: userMessage },
    ];

    // First call — may include tool calls
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 1000,
      temperature: 0.7,
    });

    const choice = response.choices[0];
    if (!choice?.message) return "Lo siento, no pude procesar tu consulta.";

    // If GPT wants to call a tool
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolCall = choice.message.tool_calls[0] as any;

      if (toolCall.function?.name === "buscar_producto") {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`[AI Bot] Searching products: "${args.query}"`);

        const searchResult = await searchProducts(args.query);

        // Second call — with tool result
        const followUp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            ...messages,
            choice.message,
            {
              role: "tool",
              tool_call_id: toolCall.id,
              content: searchResult,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        return followUp.choices[0]?.message?.content ?? "No pude generar una respuesta.";
      }
    }

    // Direct response (no tool call needed)
    return choice.message.content ?? "No pude generar una respuesta.";
  } catch (err) {
    console.error("[AI Bot] Error:", err);
    return "Disculpa, tuve un problema al procesar tu mensaje. Intentá de nuevo en unos segundos.";
  }
}
