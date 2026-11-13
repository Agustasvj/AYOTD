import { createClient, SupabaseClient } from "@supabase/supabase-js";
import https from "https";
import http from "http";

let cachedAdmin: SupabaseClient | null = null;
let proxyAgent: any = null;

const proxy =
  process.env.https_proxy ||
  process.env.http_proxy ||
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY;

if (proxy) {
  try {
    // eslint-disable-next-line
    const { HttpsProxyAgent } = require("next/dist/compiled/https-proxy-agent");
    proxyAgent = new HttpsProxyAgent(proxy);
  } catch {
    // Fallback to default fetch if proxy agent cannot be instantiated
  }
}

function serverFetch(input: any, init: any = {}): Promise<Response> {
  if (!proxyAgent) {
    return fetch(input, init);
  }

  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input?.url || String(input);
  const parsedUrl = new URL(urlStr);
  const isHttps = parsedUrl.protocol === "https:";
  const client = isHttps ? https : http;

  const headers: Record<string, string> = {};
  if (init?.headers) {
    if (typeof init.headers.forEach === "function") {
      init.headers.forEach((v: string, k: string) => {
        headers[k] = v;
      });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([k, v]: [string, string]) => {
        headers[k] = v;
      });
    } else {
      Object.assign(headers, init.headers);
    }
  }

  return new Promise<Response>((resolve, reject) => {
    const req = client.request(
      parsedUrl,
      {
        method: init?.method || "GET",
        headers,
        agent: isHttps ? proxyAgent : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = chunks.length > 0 ? Buffer.concat(chunks).toString("utf8") : null;
          const status = res.statusCode || 200;
          const isNullBody = [204, 205, 304].includes(status) || !body;
          resolve(
            new Response(isNullBody ? null : body, {
              status,
              statusText: res.statusMessage,
              headers: res.headers as any,
            })
          );
        });
      }
    );

    req.on("error", reject);
    if (init?.body) {
      req.write(init.body);
    }
    req.end();
  });
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  if (!cachedAdmin) {
    cachedAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { "x-client-info": "ayotd-fast-server" },
        fetch: proxyAgent ? (serverFetch as any) : undefined
      }
    });
  }

  return cachedAdmin;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
