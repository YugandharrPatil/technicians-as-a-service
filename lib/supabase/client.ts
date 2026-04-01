import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
	return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!);
}

// Singleton for client-side usage
let browserClient: ReturnType<typeof createClient> | undefined;

export function getSupabaseBrowserClient() {
	if (typeof window === "undefined") {
		throw new Error("getSupabaseBrowserClient must only be called on the client side");
	}
	if (!browserClient) {
		browserClient = createClient();
	}
	return browserClient;
}
