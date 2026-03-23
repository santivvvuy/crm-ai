# AI Toggle + Mobile PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar control de IA por conversación (botón "Tomar Control") y optimizar la app para mobile con soporte PWA.

**Architecture:** Se agrega `ai_enabled` a la tabla `contacts` en Supabase. El workflow n8n existente (`AI_MSJ_MP`) chequea ese campo antes de llamar a la IA. El frontend expone un toggle visible en el header del chat. La UI se convierte en PWA instalable y responsiva para mobile.

**Tech Stack:** Next.js 16, Supabase JS v2, Tailwind CSS v4, n8n (edición manual), PWA Manifest

---

## File Map

| File | Acción | Responsabilidad |
|------|--------|----------------|
| `app/page.tsx` | Modificar | Agregar campo `aiEnabled` al tipo `Contact`, fetch, toggle handler y botón en header |
| `app/layout.tsx` | Modificar | Agregar meta PWA (viewport, theme-color, manifest link) |
| `public/manifest.json` | Crear | PWA manifest (nombre, iconos, colores, display standalone) |
| `public/icon-192.png` | Crear | Ícono PWA 192×192 (placeholder SVG convertido) |
| `public/icon-512.png` | Crear | Ícono PWA 512×512 (placeholder SVG convertido) |

---

## Task 1: Supabase — Agregar columna `ai_enabled`

**Files:**
- Modify: `contacts` table en Supabase (via MCP SQL)

- [ ] **Step 1: Agregar columna con valor por defecto `true`**

```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;
```

Ejecutar con el MCP de Supabase (project_id: `syvcyorzavoemoheokex`).

- [ ] **Step 2: Verificar que la columna existe**

```sql
SELECT id, name, ai_enabled FROM contacts LIMIT 5;
```

Expected: columna `ai_enabled` con valor `true` en todos los contactos existentes.

---

## Task 2: n8n — Agregar chequeo de `ai_enabled` en el workflow

**MANUAL — Editar workflow `AI_MSJ_MP` en la interfaz de n8n.**

El workflow actual siempre llama a la IA después de "Guardar Mensaje". Hay que agregar un chequeo antes.

- [ ] **Step 1: Agregar nodo HTTP Request "Obtener ai_enabled"**

Después del nodo **"Guardar Mensaje"**, antes del nodo **"AI Agent"**, agregar:

- Tipo: `HTTP Request`
- Nombre: `Obtener ai_enabled`
- Method: `GET`
- URL:
```
https://syvcyorzavoemoheokex.supabase.co/rest/v1/contacts?id=eq.{{ $node['Guardar Mensaje'].json.contact_id }}&select=ai_enabled
```

> Nota: usar `$node['Guardar Mensaje'].json.contact_id` — ese nodo ya tiene el ID resuelto tanto para contactos existentes como nuevos, sin necesidad del operador `??`.
- Headers:
  - `apikey`: (mismo valor que en los otros nodos)
  - `Authorization`: `Bearer ...` (mismo token)

- [ ] **Step 2: Agregar nodo If "¿IA habilitada?"**

Después de "Obtener ai_enabled":

- Tipo: `If`
- Nombre: `¿IA habilitada?`
- Condición: `{{ $json[0].ai_enabled }}` equals `true`
- Branch TRUE → conectar al nodo **"AI Agent"** (como estaba)
- Branch FALSE → no conectar nada (la ejecución termina, no responde la IA)

- [ ] **Step 3: Actualizar el system prompt del AI Agent**

Reemplazar el systemMessage actual con este prompt completo:

```
Eres el asistente virtual de MarketPhone, tienda de celulares en Uruguay.

REGLA DE ORO: Antes de responder cualquier duda sobre precios o modelos, usa la herramienta 'buscar_producto'.

SOLO responde preguntas relacionadas a celulares. No respondas otras preguntas.

━━━ RESPUESTAS FIJAS ━━━

Si preguntan QUÉ TARJETAS ACEPTAN:
💳 *TARJETAS:*
➡️ OCA 12 cuotas
➡️ AMEX 12 cuotas
➡️ VISA 10 cuotas
➡️ MASTER 6 cuotas
➡️ DINERS 6 cuotas
*Pago mediante Mercado Pago.

Si preguntan UBICACIÓN o LOCAL:
De momento nos estamos mudando, por lo que tenemos las siguientes opciones de entrega:
——————————————
📍 *Punto de encuentro en Montevideo*
- Coordinamos dia y hora
- Pagas al retirar.
——————————————
🏠 *ENVÍO A DOMICILIO (Montevideo y C. Costa)*
- Sin costo.
- Pagas al recibir.
——————————————
🚚 *ENVÍOS AL INTERIOR*
- Despachamos en el mismo día.
- Llega en 24 horas.
- Pago previo al envío
——————————————

Si preguntan PLAN RECAMBIO / PERMUTA:
Si! Precisamos saber de tu celular:
1) Modelo
2) Capacidad de almacenamiento
3) Condición de batería
4) Detalles estéticos o funcionales

━━━ PRECIOS / STOCK ━━━

Usa buscar_producto y responde en este formato:

📲 [Modelo]
💵 *Efectivo: U$S [precio]*
💳 Tarjeta: U$S [precio tarjeta]
[Si es nuevo] Son nuevos sellados, con 1️⃣año de garantía Apple oficial! 🆕
[Si es exhibición] Equipo de Exhibición en excelente estado, con 1️⃣AÑO de garantía! ♻️
🎨 Colores: [colores]
📦 Stock: [cantidad]

Precios siempre en dólares americanos U$S.
```

- [ ] **Step 4: Guardar y activar el workflow**

Hacer clic en "Save" y verificar que el workflow sigue activo (toggle verde).

---

## Task 3: Frontend — Toggle de IA por conversación

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Agregar `aiEnabled` al tipo `Contact` y al fetch**

En el tipo `Contact` (línea ~6):
```typescript
type Contact = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  aiEnabled: boolean;   // <-- agregar
};
```

En el `select` del fetch de contactos (línea ~68):
```typescript
.select("id, name, phone, last_message, last_message_time, unread_count, online, ai_enabled")
```

En el `.map()` que construye los contactos (línea ~78):
```typescript
aiEnabled: row.ai_enabled ?? true,
```

- [ ] **Step 2: Agregar función `toggleAI`**

> ⚠️ **Importante:** `toggleAI` llama a `setSelectedContact`, lo que normalmente re-dispararía el `useEffect` de mensajes. Para evitarlo, el `useEffect` de mensajes debe usar `selectedContact?.id` como dependencia en lugar de `selectedContact` completo. Ver Step 2b.

Después del estado `loadingMessages`, antes del primer `useEffect`:
```typescript
async function toggleAI(contact: Contact) {
  const newValue = !contact.aiEnabled;
  // Optimistic update
  setContacts((prev) =>
    prev.map((c) => (c.id === contact.id ? { ...c, aiEnabled: newValue } : c))
  );
  if (selectedContact?.id === contact.id) {
    setSelectedContact((prev) => prev ? { ...prev, aiEnabled: newValue } : prev);
  }
  const { error } = await supabase
    .from("contacts")
    .update({ ai_enabled: newValue })
    .eq("id", contact.id);
  if (error) {
    console.error("Error toggling AI:", error);
    // Revert on error
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, aiEnabled: !newValue } : c))
    );
    if (selectedContact?.id === contact.id) {
      setSelectedContact((prev) => prev ? { ...prev, aiEnabled: !newValue } : prev);
    }
  }
}
```

- [ ] **Step 2b: Cambiar dependencia del useEffect de mensajes**

En el `useEffect` que carga mensajes (línea ~97), cambiar la dependencia de `[selectedContact]` a `[selectedContact?.id]`:

```typescript
// Antes:
}, [selectedContact]);

// Después:
}, [selectedContact?.id]);
```

Esto evita que el toggle de IA recargue los mensajes.

- [ ] **Step 3: Agregar botón toggle en el Chat Header**

Dentro del `<header>` del chat (cerca de la línea ~332, puede haber corrido unas líneas con los cambios anteriores), reemplazar el bloque de botones de la derecha:

```tsx
<div className="flex items-center gap-2">
  {/* Toggle IA */}
  <button
    onClick={() => selectedContact && toggleAI(selectedContact)}
    title={selectedContact?.aiEnabled ? "IA activa — click para tomar control" : "Modo manual — click para activar IA"}
    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      selectedContact?.aiEnabled
        ? "bg-[#00a884] text-[#111b21] hover:bg-[#008f6f]"
        : "bg-[#2a3942] text-[#8696a0] hover:bg-[#3a4a52]"
    }`}
  >
    <span>{selectedContact?.aiEnabled ? "🤖 IA" : "👤 Vos"}</span>
  </button>
  <button className="rounded-full p-2 text-[#aebac1] transition-colors hover:bg-[#2a3942]" aria-label="Search">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
    </svg>
  </button>
  <button className="rounded-full p-2 text-[#aebac1] transition-colors hover:bg-[#2a3942]" aria-label="Menu">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z" />
    </svg>
  </button>
</div>
```

- [ ] **Step 4: Indicador visual en la lista de contactos**

En la lista de contactos, agregar un pequeño dot de IA debajo del avatar para saber de un vistazo qué conversaciones tienen IA activa. Dentro del `<div className="relative shrink-0">` del contacto:

```tsx
{contact.aiEnabled && (
  <span
    className="absolute -bottom-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00a884] text-[8px]"
    title="IA activa"
  >
    🤖
  </span>
)}
```

- [ ] **Step 5: Verificar en navegador**

- Abrir `http://localhost:3000`
- El botón debe aparecer en el header del chat: verde "🤖 IA" cuando activo
- Al hacer click debe cambiar a gris "👤 Vos"
- Verificar en Supabase que `ai_enabled` cambió:
```sql
SELECT id, name, ai_enabled FROM contacts;
```

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add AI toggle button per conversation"
```

---

## Task 4: Mobile PWA

**Files:**
- Modify: `app/layout.tsx`
- Create: `public/manifest.json`

- [ ] **Step 1: Crear manifest.json**

Crear `public/manifest.json`:
```json
{
  "name": "MarketPhone CRM",
  "short_name": "MarketPhone",
  "description": "CRM de WhatsApp para MarketPhone",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111b21",
  "theme_color": "#202c33",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Actualizar layout.tsx con meta tags PWA y viewport mobile**

Leer `app/layout.tsx` primero. Reemplazar la línea de import (actualmente solo importa `Metadata`) con la siguiente, que agrega `Viewport`:

```typescript
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#202c33",
};

export const metadata: Metadata = {
  title: "MarketPhone CRM",
  description: "CRM de WhatsApp — MarketPhone",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MarketPhone",
  },
};
```

- [ ] **Step 3: Ajustar layout mobile en page.tsx**

El contenedor raíz actual usa `h-screen w-screen`. En mobile hay que asegurarse que ocupe 100dvh (dynamic viewport height) para evitar problemas con la barra del navegador.

Cambiar la línea del contenedor principal (línea ~228):
```tsx
// Antes:
<div className="flex h-screen w-screen items-center justify-center bg-[#111b21]">

// Después:
<div className="flex h-[100dvh] w-screen items-center justify-center bg-[#111b21]">
```

- [ ] **Step 4: Layout responsivo — ocultar sidebar en mobile cuando hay chat abierto**

El `<aside>` actual tiene `w-[420px] min-w-[320px]`. En mobile debe ocupar toda la pantalla cuando no hay chat, y ocultarse cuando hay uno seleccionado.

Cambiar el `<aside>`:
```tsx
<aside className={`flex flex-col border-r border-[#222d35] bg-[#111b21]
  ${selectedContact ? 'hidden md:flex' : 'flex'}
  w-full md:w-[420px] md:min-w-[320px]`}>
```

Agregar botón "Volver" en el chat header (mobile) para desseleccionar el contacto. Al principio del chat header, antes del avatar:

```tsx
{/* Botón volver — solo mobile */}
<button
  onClick={() => setSelectedContact(null)}
  className="mr-1 rounded-full p-1.5 text-[#aebac1] transition-colors hover:bg-[#2a3942] md:hidden"
  aria-label="Volver"
>
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
</button>
```

Y el `<main>` del chat:
```tsx
<main className={`flex flex-1 flex-col bg-[#0b141a]
  ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
```

- [ ] **Step 5: Generar íconos PWA como PNG reales**

El proyecto tiene `public/file.svg`. Usar un script Node para convertirlo a PNG real (los `.ico` renombrados a `.png` no son PNG válidos y Chrome no mostrará el prompt de instalación):

```bash
cd /Users/santiagovarela/crm-ai
npm install --save-dev sharp
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('public/file.svg');
sharp(svg).resize(192, 192).png().toFile('public/icon-192.png', (e) => { if(e) console.error(e); else console.log('icon-192.png OK'); });
sharp(svg).resize(512, 512).png().toFile('public/icon-512.png', (e) => { if(e) console.error(e); else console.log('icon-512.png OK'); });
"
```

> Para producción, reemplazar con el logo real de MarketPhone (PNG o SVG). Luego desinstalar sharp si no se necesita: `npm uninstall sharp`.

- [ ] **Step 6: Verificar en mobile**

- Abrir Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M)
- Seleccionar "iPhone 14 Pro"
- Verificar: la lista de contactos ocupa toda la pantalla
- Tap en un contacto: debe mostrarse el chat
- Tap en "←": vuelve a la lista
- En Chrome mobile real: "Agregar a pantalla de inicio" debe aparecer

- [ ] **Step 7: Build y deploy**

```bash
cd /Users/santiagovarela/crm-ai
npm run build
```

Si el build pasa sin errores:
```bash
vercel --prod
```

- [ ] **Step 8: Commit final**

```bash
git add app/page.tsx app/layout.tsx public/manifest.json
git commit -m "feat: mobile PWA layout with responsive navigation"
```

---

## Orden de ejecución recomendado

1. **Task 1** (Supabase) — 2 minutos, sin riesgo
2. **Task 3** (Frontend toggle) — requiere Task 1 terminado
3. **Task 2** (n8n manual) — independiente, hacerlo en paralelo con Task 3
4. **Task 4** (Mobile PWA) — independiente de las anteriores

## Notas importantes

- **n8n no puede modificarse via MCP** — Task 2 requiere edición manual en la interfaz de n8n
- **Líneas en page.tsx:** Los números de línea en Task 3 son aproximados para el archivo original. Si se hacen ediciones previas (Task 3 Steps 1-2), las líneas del Step 3 en adelante se correrán. Usar búsqueda de texto en lugar de saltar a línea exacta.
- **useEffect de mensajes:** Cambiar la dependencia a `[selectedContact?.id]` (Step 2b) es requerido para que `toggleAI` no recargue los mensajes.
- Los íconos PWA deben ser PNGs reales (generados con sharp), no archivos .ico renombrados. Reemplazar con el logo real de MarketPhone antes de producción.
