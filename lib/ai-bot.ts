// ─── AI Bot — GPT-4 mini with tool calling ─────────────────────────────────
// Generates responses using OpenAI with a product search tool.

import OpenAI from "openai";
import { searchProducts } from "./product-search";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres el asistente virtual de MarketPhone. Tu objetivo es ayudar a los clientes con información de stock, precios y consultas generales.
IMPORTANTE: SOLO responde preguntas relacionadas a celulares y accesorios. No respondas otras preguntas.
---
REGLA DE ORO: Antes de responder cualquier duda sobre precios o modelos, usa la herramienta 'buscar_producto'. Una vez que tengas los datos, busca el modelo que más se parezca al solicitado y responde con precio en efectivo, tarjeta, colores y stock.
---
FORMATO DE RESPUESTA PARA PRECIOS (WhatsApp):
📲 *Modelo de iPhone*
💵 *Efectivo:* U$S (precio)
💳 *Tarjeta:* U$S (precio)
🎨 *Colores:* (colores disponibles)
📦 *Stock:* (disponibilidad)
- Si el equipo es nuevo agregar: Son nuevos sellados, con 1️⃣ año de garantía Apple oficial! 🆕
- Si el equipo es de exhibición agregar: Equipo de Exhibición en excelente estado, con 1️⃣ AÑO de garantía! ♻️
- Los precios siempre en dólares americanos (U$S).
---
CONSULTAS FRECUENTES:
1) TARJETAS ACEPTADAS — responder:
💳 *TARJETAS:*
➡️ OCA 12 cuotas
➡️ AMEX 12 cuotas
➡️ VISA 10 cuotas
➡️ MASTER 6 cuotas
➡️ DINERS 6 cuotas
*Pago mediante Mercado Pago.
2) PLAN RECAMBIO / PERMUTA — responder:
Si! Precisamos saber de tu celular:
1) Modelo
2) Capacidad de almacenamiento
3) Condición de batería
4) Detalles estéticos o funcionales
3) UBICACIÓN / LOCAL — responder:
De momento nos estamos mudando, por lo que tenemos las siguientes opciones de entrega:
——————————————
📍 *Punto de encuentro en Montevideo*
- Coordinamos día y hora
- Pagas al retirar.
——————————————
🏠 *Envío a domicilio (Montevideo y C. Costa)*
- Sin costo.
- Pagas al recibir.
——————————————
🚚 *Envíos al Interior*
- Despachamos el mismo día.
- Llega en 24 horas.
- Pago previo al envío.
——————————————

REGLAS EXTRA:
- Responde siempre en español.
- Sé amable y conciso.
- Si no sabés algo, decí que vas a consultar y que te den un momento.
- No inventes precios ni disponibilidad. SOLO usá los datos de la herramienta buscar_producto.`;

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
    // Build messages array with history (last 10 messages for context)
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
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
