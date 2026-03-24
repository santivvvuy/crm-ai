// ─── Google Sheets product search ───────────────────────────────────────────
// Fetches the published CSV and searches for products by name.
// Cache the data for 5 minutes to avoid hitting Google on every message.

interface Product {
  modelo: string;
  condicion: string;
  almacenamiento: string;
  colores: string;
  precio_efectivo: string;
  precio_tarjeta: string;
  stock: string;
  [key: string]: string;
}

let cachedProducts: Product[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function parseCSV(csv: string): Product[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // First line = headers
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  return lines.slice(1).map((line) => {
    // Handle CSV with quoted fields
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const product: Record<string, string> = {};
    headers.forEach((h, i) => {
      product[h] = values[i] ?? "";
    });
    return product as unknown as Product;
  });
}

async function fetchProducts(): Promise<Product[]> {
  const now = Date.now();
  if (cachedProducts.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return cachedProducts;
  }

  const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;
  if (!csvUrl) {
    console.error("[Products] GOOGLE_SHEET_CSV_URL not set");
    return [];
  }

  try {
    const res = await fetch(csvUrl, { cache: "no-store" });
    if (!res.ok) {
      console.error("[Products] Failed to fetch CSV:", res.status);
      return cachedProducts; // return stale cache if available
    }

    const csv = await res.text();
    cachedProducts = parseCSV(csv);
    cacheTimestamp = now;

    console.log(`[Products] Loaded ${cachedProducts.length} products from Google Sheets`);
    return cachedProducts;
  } catch (err) {
    console.error("[Products] Error fetching CSV:", err);
    return cachedProducts;
  }
}

export async function searchProducts(query: string): Promise<string> {
  const products = await fetchProducts();
  if (products.length === 0) {
    return "No se pudieron cargar los productos. Intentá de nuevo más tarde.";
  }

  const q = query.toLowerCase();

  // Search by model name (fuzzy)
  const matches = products.filter((p) => {
    const searchFields = Object.values(p).join(" ").toLowerCase();
    // Check if all words in query appear somewhere in the product
    const words = q.split(/\s+/).filter(Boolean);
    return words.every((w) => searchFields.includes(w));
  });

  if (matches.length === 0) {
    // Try partial match
    const partialMatches = products.filter((p) => {
      const searchFields = Object.values(p).join(" ").toLowerCase();
      const words = q.split(/\s+/).filter(Boolean);
      return words.some((w) => searchFields.includes(w));
    });

    if (partialMatches.length === 0) {
      return `No encontré productos que coincidan con "${query}". Productos disponibles: ${products
        .slice(0, 10)
        .map((p) => p.modelo || Object.values(p)[0])
        .join(", ")}`;
    }

    return formatResults(partialMatches.slice(0, 5));
  }

  return formatResults(matches.slice(0, 5));
}

function formatResults(products: Product[]): string {
  return products
    .map((p) => {
      const entries = Object.entries(p).filter(([, v]) => v);
      return entries.map(([k, v]) => `${k}: ${v}`).join("\n");
    })
    .join("\n---\n");
}
