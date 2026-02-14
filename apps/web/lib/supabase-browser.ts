import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

function getSupabaseBrowserConfig():
  | {
      url: string;
      anonKey: string;
    }
  | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

export function isSupabaseBrowserConfigured(): boolean {
  return getSupabaseBrowserConfig() !== null;
}

export function getSupabaseBrowser() {
  if (browserClient) {
    return browserClient;
  }

  const config = getSupabaseBrowserConfig();
  if (!config) {
    return null;
  }

  browserClient = createBrowserClient(config.url, config.anonKey);
  return browserClient;
}
