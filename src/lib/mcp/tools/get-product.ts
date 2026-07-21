declare const process: { env: Record<string, string | undefined> };

import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: ctx.isAuthenticated() ? { headers: { Authorization: `Bearer ${ctx.getToken()}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_product",
  title: "Get product",
  description: "Get full detail for a single NORTHVEIZ product by id, including per-size stock.",
  inputSchema: { product_id: z.string().min(1).describe("Product id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ product_id }, ctx) => {
    const { data, error } = await client(ctx).from("products").select("*").eq("id", product_id).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Product not found" }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { product: data } };
  },
});
