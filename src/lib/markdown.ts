import "server-only";
import { getProcessor } from "bytemd";
import { bytemdPlugins } from "@/lib/bytemd-plugins";

export async function renderMarkdown(value: string): Promise<string> {
  const file = await getProcessor({ plugins: bytemdPlugins() }).process(value || "");
  return String(file);
}
