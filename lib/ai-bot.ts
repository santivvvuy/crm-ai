// ─── AI Bot — GPT-4 mini with tool calling ─────────────────────────────────
// Generates responses using OpenAI with product search + human handoff tools.

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

// ─── Return type includes handoff flag ──────────────────────────────────────

export interface BotResponse {
  text: string;
  handoff: boolean; // true = transfer to human, disable AI, add label
}

// ─── Tools ──────────────────────────────────────────────────────────────────

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
  {
    type: "function",
    function: {
      name: "transferir_a_humano",
      description:
        "Transfiere la conversación a un asistente humano. Usá esta herramienta cuando: el cliente quiera concretar una compra, coordinar entrega, pagar, hacer una permuta/recambio, o cuando no puedas responder su consulta con certeza.",
      parameters: {
        type: "object",
        properties: {
          motivo: {
            type: "string",
            description:
              "Motivo de la transferencia, por ejemplo: 'El cliente quiere concretar la compra de un iPhone 15'",
          },
        },
        required: ["motivo"],
      },
    },
  },
];

// ─── Main function ───────────────────────────────────────────────────────────

export async function generateBotResponse(
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
  isFirstMessage = false
): Promise<BotResponse> {
  try {
    const systemPrompt = await getSystemPrompt();

    // Add greeting context for first message
    const contextNote = isFirstMessage
      ? "\n\n[CONTEXTO INTERNO: Este es el PRIMER mensaje del cliente. Saludalo con: 👋 ¡Hola! Bienvenido a *MarketPhone* 📱 ¿En qué te puedo ayudar hoy?] — y luego respondé su consulta si la tiene."
      : "";

    // Build messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt + contextNote },
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
    if (!choice?.message) {
      return { text: "Lo siento, no pude procesar tu consulta.", handoff: false };
    }

    // If GPT wants to call a tool
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolCall = choice.message.tool_calls[0] as any;
      const toolName = toolCall.function?.name;

      // ── Tool: buscar_producto ──────────────────────────────────────────────
      if (toolName === "buscar_producto") {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`[AI Bot] Searching products: "${args.query}"`);

        const searchResult = await searchProducts(args.query);

        const followUp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            ...messages,
            choice.message,
            { role: "tool", tool_call_id: toolCall.id, content: searchResult },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        return {
          text: followUp.choices[0]?.message?.content ?? "No pude generar una respuesta.",
          handoff: false,
        };
      }

      // ── Tool: transferir_a_humano ─────────────────────────────────────────
      if (toolName === "transferir_a_humano") {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`[AI Bot] Handoff triggered. Reason: ${args.motivo}`);

        // Ask GPT to write the farewell message
        const farewell = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            ...messages,
            choice.message,
            {
              role: "tool",
              tool_call_id: toolCall.id,
              content: "Transferencia iniciada. Redactá un mensaje amable de despedida informando que un asistente humano va a continuar la atención en breve.",
            },
          ],
          max_tokens: 300,
          temperature: 0.7,
        });

        return {
          text: farewell.choices[0]?.message?.content ?? "¡Enseguida te comunico con un asistente! 🙋",
          handoff: true,
        };
      }
    }

    // Direct response (no tool call needed)
    return {
      text: choice.message.content ?? "No pude generar una respuesta.",
      handoff: false,
    };
  } catch (err) {
    console.error("[AI Bot] Error:", err);
    return {
      text: "Disculpa, tuve un problema al procesar tu mensaje. Intentá de nuevo en unos segundos.",
      handoff: false,
    };
  }
}
