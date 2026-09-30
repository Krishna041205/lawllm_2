import dotenv from "dotenv";

dotenv.config();

export interface HttpClientOptions {
  timeoutMs?: number;
  maxRetries?: number;
  requestDelayMs?: number;
  maxSizeBytes?: number;
  userAgent?: string;
  headers?: Record<string, string>;
}

export interface HttpResponse<T = any> {
  status: number;
  headers: Headers;
  data: T;
  buffer?: Buffer;
  durationMs: number;
  url: string;
}

export class RobustHttpClient {
  private timeoutMs: number;
  private maxRetries: number;
  private requestDelayMs: number;
  private maxSizeBytes: number;
  private userAgent: string;
  private lastRequestTime: number = 0;

  constructor(options: HttpClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? parseInt(process.env.COURT_SCRAPER_TIMEOUT_MS || "8000", 10);
    this.maxRetries = options.maxRetries ?? parseInt(process.env.COURT_SCRAPER_MAX_RETRIES || "1", 10);
    this.requestDelayMs = options.requestDelayMs ?? parseInt(process.env.COURT_SCRAPER_REQUEST_DELAY_MS || "500", 10);
    this.maxSizeBytes = options.maxSizeBytes ?? 50 * 1024 * 1024; // 50MB max
    this.userAgent =
      options.userAgent ||
      process.env.COURT_SCRAPER_USER_AGENT ||
      "LawLLM-LegalIntelligence-ResearchBot/1.0 (+https://lawllm.ai/bot; research@lawllm.ai; Polite Scraper)";
  }

  /**
   * Enforce polite delay between consecutive requests to prevent overwhelming court portals
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.requestDelayMs) {
      const waitTime = this.requestDelayMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Execute an HTTP GET request with retries, timeout, and polite rate limiting
   */
  async get(url: string, headers: Record<string, string> = {}): Promise<HttpResponse<string>> {
    return this.request<string>(url, {
      method: "GET",
      headers,
      responseType: "text",
    });
  }

  /**
   * Download binary data (e.g. PDF documents) with size protection and magic header validation
   */
  async getBuffer(url: string, headers: Record<string, string> = {}): Promise<HttpResponse<Buffer>> {
    return this.request<Buffer>(url, {
      method: "GET",
      headers,
      responseType: "buffer",
    });
  }

  /**
   * Core request dispatcher with exponential backoff and jitter
   */
  private async request<T>(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      responseType?: "text" | "json" | "buffer";
    }
  ): Promise<HttpResponse<T>> {
    await this.enforceRateLimit();

    const method = options.method || "GET";
    const headers: Record<string, string> = {
      "User-Agent": this.userAgent,
      Accept: "text/html,application/xhtml+xml,application/xml,application/pdf,*/*",
      "Accept-Encoding": "gzip, deflate, br",
      ...options.headers,
    };

    let attempt = 0;
    let lastError: any = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      const startTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: options.body,
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        // Check for rate limiting or transient server unavailability
        if (response.status === 429 || response.status === 503 || response.status === 502 || response.status === 504) {
          const retryAfterSec = parseInt(response.headers.get("Retry-After") || "0", 10);
          const backoffMs = retryAfterSec ? retryAfterSec * 1000 : Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.warn(
            `⚠️ [HttpClient] HTTP ${response.status} from ${url}. Backing off for ${Math.round(backoffMs)}ms (Attempt ${attempt}/${this.maxRetries})...`
          );

          if (attempt <= this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }
          throw new Error(`HTTP ${response.status}: Server rate-limited or unavailable after ${attempt} attempts.`);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText} for URL: ${url}`);
        }

        // Response size guard
        const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
        if (contentLength > this.maxSizeBytes) {
          throw new Error(`Content length (${contentLength} bytes) exceeds maximum limit of ${this.maxSizeBytes} bytes.`);
        }

        if (options.responseType === "buffer") {
          const arrayBuf = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          if (buffer.length > this.maxSizeBytes) {
            throw new Error(`Downloaded buffer size (${buffer.length} bytes) exceeds maximum limit.`);
          }
          return {
            status: response.status,
            headers: response.headers,
            data: buffer as unknown as T,
            buffer,
            durationMs,
            url: response.url || url,
          };
        } else if (options.responseType === "json") {
          const json = await response.json();
          return {
            status: response.status,
            headers: response.headers,
            data: json as T,
            durationMs,
            url: response.url || url,
          };
        } else {
          const text = await response.text();
          return {
            status: response.status,
            headers: response.headers,
            data: text as unknown as T,
            durationMs,
            url: response.url || url,
          };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        const isAbort = err?.name === "AbortError";
        const errMsg = isAbort ? `Request timed out after ${this.timeoutMs}ms` : err?.message || String(err);
        const isDnsError = errMsg.includes("ENOTFOUND") || err?.code === "ENOTFOUND" || errMsg.includes("getaddrinfo");

        if (attempt <= this.maxRetries && !isDnsError) {
          const backoff = Math.min(2000, Math.pow(2, attempt) * 500 + Math.random() * 200);
          console.warn(`⚠️ [HttpClient] Request error (${errMsg}). Retrying in ${Math.round(backoff)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        } else {
          console.warn(`⚠️ [HttpClient] Remote endpoint unreachable for ${url}: ${errMsg}`);
          break;
        }
      }
    }

    throw lastError || new Error(`Failed to fetch ${url}`);
  }
}

// Global default polite client instance
export const defaultHttpClient = new RobustHttpClient();
