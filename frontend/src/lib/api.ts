// frontend/src/lib/api.ts
/**
 * PARK — API Client
 * Centralized HTTP client with auth header injection and error normalization.
 * Maps backend error codes to frontend UX treatments per §9.2 of the roadmap.
 */
const API_BASE = import.meta.env.VITE_API_URL || "";

interface ApiError {
  code: string;
  message: string;
  field?: string;
  retry_after?: number;
  incident_id?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          error: json.error || {
            code: "UNKNOWN_ERROR",
            message: "An unexpected error occurred.",
          },
        };
      }

      return json as ApiResponse<T>;
    } catch (err) {
      // fetch() throws for BOTH "genuinely offline" AND "server
      // unreachable" (CORS block, backend crashed/not running, wrong
      // port, DNS failure) — the browser doesn't tell us which. We
      // previously blamed every one of these on "offline", which sent
      // people chasing airplane-mode bugs when the real issue was a
      // misconfigured or down backend. navigator.onLine at least rules
      // out the true-offline case, so the message points the right way.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return {
          error: {
            code: "OFFLINE",
            message: "You're offline — this will save and sync automatically.",
          },
        };
      }
      return {
        error: {
          code: "SERVER_UNREACHABLE",
          message: `Can't reach the server at ${API_BASE || "(no VITE_API_URL set)"}. Check that the backend is running and that VITE_API_URL is correct.`,
        },
      };
    }
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>("POST", path, body);
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>("PATCH", path, body);
  }

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }

  // File upload with progress tracking
  async uploadFile<T>(
    path: string,
    file: File,
    onProgress?: (progress: number) => void,
    fields?: Record<string, string | number>
  ): Promise<ApiResponse<T>> {
    const isExternalUpload = /^https:\/\/api\.cloudinary\.com\//i.test(path);
    const formData = new FormData();
    Object.entries(fields || {}).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append("file", file);

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      });

      xhr.addEventListener("load", () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status < 200 || xhr.status >= 300) {
            resolve({
              error: json.error || {
                code: "UPLOAD_FAILED",
                message: json.error?.message || json.message || json.error?.http_code || `Upload failed (${xhr.status}).`,
              },
            });
            return;
          }
          if (isExternalUpload) {
            resolve({ data: { ...json, mime_type: file.type } as T });
            return;
          }
          resolve(json);
        } catch {
          resolve({
            error: {
              code: "UPLOAD_FAILED",
              message: `Upload failed (${xhr.status}): ${xhr.responseText || "Invalid server response."}`,
            },
          });
        }
      });

      xhr.addEventListener("error", () => {
        // Same reasoning as request()'s catch block: an XHR "error"
        // event fires for CORS blocks and unreachable servers just as
        // much as real offline — check navigator.onLine before blaming
        // connectivity for what might be a backend/CORS problem.
        const isReallyOffline = typeof navigator !== "undefined" && navigator.onLine === false;
        resolve({
          error: isReallyOffline
            ? { code: "OFFLINE", message: "You're offline — this will save and sync automatically." }
            : { code: "SERVER_UNREACHABLE", message: `Can't reach the server at ${API_BASE || "(no VITE_API_URL set)"}. Check that the backend is running.` },
        });
      });

      const uploadUrl = /^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`;
      xhr.open("POST", uploadUrl);
      // Cloudinary's upload endpoint does not accept the app bearer token.
      // Backend uploads remain authenticated because relative API paths still
      // receive the normal Authorization header.
      if (this.token && !isExternalUpload) {
        xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);
      }
      xhr.send(formData);
    });
  }
}

export const api = new ApiClient();
