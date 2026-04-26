import type {
  AppNotification,
  AuthTokens,
  ConversationData,
  CommunityFeedPage,
  CommunityPost,
  CommunityPostDetail,
  CommunityPostSuggestion,
  DashboardStats,
  DetectionResult,
  DirectMessage,
  FriendRequest,
  RoleCodeUpdatePayload,
  ScanHistory,
  SocialOverview,
  UserProfileDetail,
  UserProfile,
  UserRole,
  UserRoleUpdatePayload
} from "@/lib/types";
import {getApiUrl, getPlatform, isNativeMobilePlatform} from "@/lib/platform";

const API_BASE = getApiUrl();
const API_BASE_STORAGE_KEY = "bluevision_api_base";
const ACCESS_TOKEN_KEY = "bluevision_access_token";
const REFRESH_TOKEN_KEY = "bluevision_refresh_token";
const ROLE_KEY = "bluevision_user_role";
const PROFILE_KEY = "bluevision_user_profile";
export const AUTH_STATE_CHANGED_EVENT = "bluevision-auth-state-changed";

const REQUEST_TIMEOUT_MS = 15000;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

let activeApiBase = API_BASE;
const APP_STAGE = process.env.NEXT_PUBLIC_APP_STAGE?.trim() || process.env.NODE_ENV || "development";
const IS_RELEASE_BUILD = APP_STAGE === "production" || APP_STAGE === "release";

function emitAuthStateChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
  }
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getStoredAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeAuthTokens(tokens: AuthTokens): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  emitAuthStateChanged();
}

export function clearStoredTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearStoredRole();
  clearStoredProfile();
  clearProfileCache();
  emitAuthStateChanged();
}

export function getStoredRole(): UserRole | null {
  const value = window.localStorage.getItem(ROLE_KEY);
  if (value === "farmer" || value === "expert" || value === "admin" || value === "developer") {
    return value;
  }
  return null;
}

export function storeUserRole(role: UserRole): void {
  window.localStorage.setItem(ROLE_KEY, role);
}

export function clearStoredRole(): void {
  window.localStorage.removeItem(ROLE_KEY);
}

export function getStoredProfile(): UserProfile | null {
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.email === "string" &&
      typeof parsed.full_name === "string" &&
      (parsed.role === "farmer" || parsed.role === "expert" || parsed.role === "admin" || parsed.role === "developer") &&
      typeof parsed.created_at === "string"
    ) {
      return parsed as UserProfile;
    }
  } catch {
    // Ignore corrupted profile cache.
  }

  window.localStorage.removeItem(PROFILE_KEY);
  return null;
}

export function storeUserProfile(profile: UserProfile): void {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearStoredProfile(): void {
  window.localStorage.removeItem(PROFILE_KEY);
}

export function inferRoleFromProfile(profile: UserProfile): UserRole {
  return profile.role;
}

function authHeaders(token?: string): HeadersInit {
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Profile fetch cache – prevents duplicate /users/me calls from React Strict
// Mode double-invocation and repeated component mounts during navigation.
// ---------------------------------------------------------------------------
const PROFILE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
let _profileCache: { token: string; profile: UserProfile; expiresAt: number } | null = null;
const _inflightProfile = new Map<string, Promise<UserProfile>>();

function clearProfileCache(): void {
  _profileCache = null;
  _inflightProfile.clear();
}

function getPersistedApiBase(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(API_BASE_STORAGE_KEY)?.trim();
  if (!stored || !isSafeApiBase(stored)) {
    return null;
  }

  return stored;
}

function setPersistedApiBase(base: string): void {
  if (typeof window === "undefined" || !isSafeApiBase(base)) {
    return;
  }

  window.localStorage.setItem(API_BASE_STORAGE_KEY, base);
}

function dedupeBases(bases: string[]): string[] {
  const normalized: string[] = [];
  for (const base of bases) {
    const value = base.trim().replace(/\/+$/, "");
    if (!value) {
      continue;
    }
    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }
  return normalized;
}

function isLocalLikeApiBase(base: string): boolean {
  try {
    const {hostname} = new URL(base);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "10.0.2.2" || hostname.startsWith("192.168.");
  } catch {
    return false;
  }
}

function isSafeApiBase(base: string): boolean {
  try {
    const parsed = new URL(base);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function timeoutSignal(timeoutMs: number, externalSignal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(new DOMException("Request timeout", "TimeoutError")), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener(
        "abort",
        () => {
          controller.abort(externalSignal.reason);
        },
        {once: true}
      );
    }
  }

  controller.signal.addEventListener(
    "abort",
    () => {
      globalThis.clearTimeout(timeoutId);
    },
    {once: true}
  );

  return controller.signal;
}

function getApiBaseCandidates(originalBase: string): string[] {
  const candidates: string[] = [];
  candidates.push(originalBase);

  const persisted = getPersistedApiBase();
  if (persisted && persisted !== originalBase) {
    candidates.push(persisted);
  }

  if (activeApiBase && activeApiBase !== originalBase && activeApiBase !== persisted) {
    candidates.push(activeApiBase);
  }

  if (typeof window !== "undefined") {
    const platform = getPlatform();
    if (platform === "desktop") {
      candidates.push("http://127.0.0.1:8000/api", "http://localhost:8000/api", "http://127.0.0.1:8001/api", "http://localhost:8001/api");
    }

    if (platform === "android") {
      const mobileDev = process.env.NEXT_PUBLIC_MOBILE_DEV_API_URL?.trim();
      if (mobileDev) {
        candidates.push(mobileDev);
      }
      candidates.push("http://10.0.2.2:8000/api", "http://192.168.1.50:8000/api", "http://localhost:8000/api", "http://10.0.2.2:8001/api", "http://192.168.1.50:8001/api", "http://localhost:8001/api");
    }
  }

  return dedupeBases(candidates);
}

function toUrlString(input: RequestInfo | URL): string | null {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return null;
}

function replaceApiBase(url: string, fromBase: string, toBase: string): string {
  return url.startsWith(fromBase) ? `${toBase}${url.slice(fromBase.length)}` : url;
}

function rememberWorkingApiBase(base: string): void {
  activeApiBase = base;
  if (IS_RELEASE_BUILD && isLocalLikeApiBase(base)) {
    return;
  }

  setPersistedApiBase(base);
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("X-Request-ID")) {
    headers.set("X-Request-ID", generateRequestId());
  }

  const fetchWithPolicies = async (target: RequestInfo | URL): Promise<Response> => {
    const signal = timeoutSignal(REQUEST_TIMEOUT_MS, init?.signal ?? undefined);
    const requestInit: RequestInit = {
      ...init,
      headers,
      signal,
      cache: init?.cache ?? "no-store"
    };

    let response = await fetch(target, requestInit);
    if (RETRYABLE_STATUS.has(response.status) && (init?.method ?? "GET").toUpperCase() === "GET") {
      await sleep(250);
      response = await fetch(target, requestInit);
    }
    return response;
  };

  const originalUrl = toUrlString(input);
  const candidates = getApiBaseCandidates(API_BASE);
  const preferredBase = candidates[0] ?? API_BASE;
  const firstUrl = originalUrl ? replaceApiBase(originalUrl, API_BASE, preferredBase) : null;
  const firstInput: RequestInfo | URL = firstUrl ?? input;

  try {
    const response = await fetchWithPolicies(firstInput);
    if (originalUrl && firstUrl && firstUrl !== originalUrl) {
      rememberWorkingApiBase(preferredBase);
    }
    return response;
  } catch {
    if (!originalUrl) {
      throw new Error(resolveBackendUnavailableMessage());
    }

    for (const candidateBase of candidates.slice(1)) {
      const nextUrl = replaceApiBase(originalUrl, API_BASE, candidateBase);
      if (nextUrl === originalUrl) {
        continue;
      }

      try {
        const response = await fetchWithPolicies(nextUrl);
        rememberWorkingApiBase(candidateBase);
        return response;
      } catch {
        // Try next candidate.
      }
    }

    throw new Error(resolveBackendUnavailableMessage());
  }
}

function resolveBackendUnavailableMessage(): string {
  if (typeof window !== "undefined" && isNativeMobilePlatform()) {
    return "Unable to reach BlueVision backend. Verify the phone and API server are on the same network and the mobile API URL is correct.";
  }

  if (typeof window !== "undefined" && isLocalHostname(window.location.hostname)) {
    return "Unable to reach BlueVision backend. Please start backend server on port 8000 or 8001.";
  }

  return "Unable to reach BlueVision backend. Please verify the deployed API is reachable.";
}

export function logApiError(context: {
  endpoint: string;
  status: number;
  message: string;
  requestId?: string;
}): void {
  const entry = { ts: new Date().toISOString(), ...context };
  console.error(JSON.stringify(entry));
}

async function handleApiError(
  res: Response,
  endpoint: string,
  fallbackMessage: string
): Promise<never> {
  const requestId = res.headers.get("x-request-id") ?? undefined;
  const message = await readErrorMessage(res, fallbackMessage);
  logApiError({ endpoint, status: res.status, message, requestId });
  throw new Error(message);
}

export async function login(email: string, password: string) {
  const res = await apiFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    await handleApiError(res, "auth/login", "Invalid credentials");
  }

  return res.json() as Promise<AuthTokens>;
}

export async function refreshAccessToken(): Promise<AuthTokens | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const res = await apiFetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!res.ok) {
    clearStoredTokens();
    return null;
  }

  const tokens = (await res.json()) as AuthTokens;
  storeAuthTokens(tokens);
  return tokens;
}

async function authFetch(
  buildRequest: (token: string) => Promise<Response>,
  token?: string
): Promise<Response> {
  const initialToken = token ?? getStoredAccessToken();
  if (!initialToken) {
    throw new Error("Unauthorized");
  }

  let response = await buildRequest(initialToken);
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    throw new Error("Session expired. Please sign in again.");
  }

  response = await buildRequest(refreshed.access_token);
  return response;
}

export async function logoutCurrentSession(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearStoredTokens();
    return;
  }

  try {
    await apiFetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  } finally {
    clearStoredTokens();
  }
}

export async function signup(payload: { email: string; full_name: string; password: string }) {
  const res = await apiFetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    await handleApiError(res, "auth/signup", "Unable to create account");
  }

  return res.json() as Promise<UserProfile>;
}

async function readErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string | Array<{ msg?: string }> };
    if (typeof payload.detail === "string" && payload.detail.trim().length > 0) {
      return payload.detail;
    }

    if (Array.isArray(payload.detail) && payload.detail.length > 0) {
      const firstMessage = payload.detail[0]?.msg;
      if (typeof firstMessage === "string" && firstMessage.trim().length > 0) {
        return firstMessage;
      }
    }
  } catch {
    // Keep fallback when server response is not JSON.
  }

  return fallbackMessage;
}

export async function fetchProfile(token: string): Promise<UserProfile> {
  // Return valid cached profile immediately.
  if (_profileCache && _profileCache.token === token && Date.now() < _profileCache.expiresAt) {
    return _profileCache.profile;
  }

  // Deduplicate concurrent requests for the same token (React Strict Mode fires
  // effects twice in development, which would otherwise send two identical requests).
  const inflight = _inflightProfile.get(token);
  if (inflight) return inflight;

  const request = (async () => {
    try {
      const res = await authFetch(
        async (authToken) =>
          apiFetch(`${API_BASE}/users/me`, {
            headers: { ...authHeaders(authToken) }
          }),
        token
      );

      if (!res.ok) {
        await handleApiError(res, "users/me", "Unauthorized");
      }

      const profile = (await res.json()) as UserProfile;
      _profileCache = { token, profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS };
      storeUserProfile(profile);
      return profile;
    } finally {
      _inflightProfile.delete(token);
    }
  })();

  _inflightProfile.set(token, request);
  return request;
}

export async function fetchUsers(token: string): Promise<UserProfile[]> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/users`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "users", "Failed to load users");
  }

  return res.json() as Promise<UserProfile[]>;
}

export async function fetchMyProfileDetail(token: string): Promise<UserProfileDetail> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/users/me/profile`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "users/me/profile", "Failed to load profile");
  }

  return res.json() as Promise<UserProfileDetail>;
}

export async function updateMyProfile(input: {
  token: string;
  fullName: string;
  role: "farmer" | "expert";
  avatar?: File | null;
}): Promise<UserProfile> {
  const formData = new FormData();
  formData.append("full_name", input.fullName);
  formData.append("role", input.role);
  if (input.avatar) {
    formData.append("avatar", input.avatar);
  }

  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/users/me/profile`, {
      method: "PATCH",
      headers: {
        ...authHeaders(authToken)
      },
      body: formData
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "users/me/profile-update", "Failed to update profile");
  }

  const profile = (await res.json()) as UserProfile;
  storeUserProfile(profile);
  return profile;
}

export async function updateUserRole(input: {
  token: string;
  userId: string;
  payload: UserRoleUpdatePayload;
}): Promise<UserProfile> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/users/${input.userId}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(authToken)
      },
      body: JSON.stringify(input.payload)
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "users/role", "Failed to update user role");
  }

  const profile = (await res.json()) as UserProfile;
  storeUserProfile(profile);
  return profile;
}

export async function redeemRoleByCode(input: {
  token: string;
  payload: RoleCodeUpdatePayload;
}): Promise<UserProfile> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/users/self/role/by-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(authToken)
      },
      body: JSON.stringify(input.payload)
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "users/role/by-code", "Failed to apply role code");
  }

  const profile = (await res.json()) as UserProfile;
  storeUserProfile(profile);
  return profile;
}

export async function fetchHistory(token: string): Promise<ScanHistory[]> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/dashboard/history`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "dashboard/history", "Failed to load history");
  }

  return res.json() as Promise<ScanHistory[]>;
}

export async function fetchStats(token: string): Promise<DashboardStats> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/dashboard/stats`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "dashboard/stats", "Failed to load stats");
  }

  return res.json() as Promise<DashboardStats>;
}

export async function fetchTips(token: string): Promise<string[]> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/dashboard/tips`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "dashboard/tips", "Failed to load tips");
  }

  return res.json() as Promise<string[]>;
}

export async function detectPlant(input: {
  token: string;
  image: File;
  segmented?: File;
  domain: string;
}): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append("image", input.image);
  formData.append("domain", input.domain);
  if (input.segmented) {
    formData.append("segmented_image", input.segmented);
  }

  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/detect`, {
      method: "POST",
      headers: {
        ...authHeaders(authToken)
      },
      body: formData
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "detect", "Detection failed");
  }

  return res.json() as Promise<DetectionResult>;
}

export async function fetchCommunityPosts(input: {
  token: string;
  sort: "newest" | "oldest" | "top";
  offset?: number;
  limit?: number;
}): Promise<CommunityFeedPage> {
  const search = new URLSearchParams({
    sort: input.sort,
    offset: String(input.offset ?? 0),
    limit: String(input.limit ?? 8)
  });
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/community/posts?${search.toString()}`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "community/posts", "Failed to load community posts");
  }

  return res.json() as Promise<CommunityFeedPage>;
}

export async function fetchCommunityPostDetails(input: {
  token: string;
  postId: string;
  commentSort?: "newest" | "oldest";
}): Promise<CommunityPostDetail> {
  const search = new URLSearchParams({comment_sort: input.commentSort ?? "newest"});
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/community/posts/${input.postId}?${search.toString()}`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "community/post-detail", "Failed to load post details");
  }

  return res.json() as Promise<CommunityPostDetail>;
}

export async function toggleCommunityPostLike(input: {
  token: string;
  postId: string;
}): Promise<CommunityPost> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/community/posts/${input.postId}/like`, {
      method: "POST",
      headers: {
        ...authHeaders(authToken)
      }
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "community/post-like", "Failed to update like");
  }

  return res.json() as Promise<CommunityPost>;
}

export async function createCommunityComment(input: {
  token: string;
  postId: string;
  body: string;
  parentCommentId?: string | null;
}): Promise<CommunityPostDetail> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/community/posts/${input.postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(authToken)
      },
      body: JSON.stringify({body: input.body, parent_comment_id: input.parentCommentId ?? null})
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "community/post-comment", "Failed to add comment");
  }

  return res.json() as Promise<CommunityPostDetail>;
}

export async function updateCommunityComment(input: {
  token: string;
  commentId: string;
  body: string;
}): Promise<CommunityPostDetail> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/community/comments/${input.commentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(authToken)
      },
      body: JSON.stringify({body: input.body})
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "community/comment-update", "Failed to update comment");
  }

  return res.json() as Promise<CommunityPostDetail>;
}

export async function deleteCommunityComment(input: {
  token: string;
  commentId: string;
}): Promise<CommunityPostDetail> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/community/comments/${input.commentId}`, {
      method: "DELETE",
      headers: {
        ...authHeaders(authToken)
      }
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "community/comment-delete", "Failed to delete comment");
  }

  return res.json() as Promise<CommunityPostDetail>;
}

export async function createCommunityPost(input: {
  token: string;
  plantName: string;
  problem: string;
  title?: string;
  aiDisease: string;
  aiConfidenceScore: number;
  image: File;
}): Promise<CommunityPost> {
  const formData = new FormData();
  formData.append("plant_name", input.plantName);
  formData.append("problem", input.problem);
  if (input.title) {
    formData.append("title", input.title);
  }
  formData.append("ai_disease", input.aiDisease);
  formData.append("ai_confidence_score", String(input.aiConfidenceScore));
  formData.append("image", input.image);

  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/community/posts`, {
      method: "POST",
      headers: {
        ...authHeaders(authToken)
      },
      body: formData
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "community/post-create", "Failed to create post");
  }

  return res.json() as Promise<CommunityPost>;
}

export async function fetchCommunityPostSuggestion(input: {
  token: string;
  problem: string;
  image: File;
}): Promise<CommunityPostSuggestion> {
  const formData = new FormData();
  formData.append("problem", input.problem);
  formData.append("image", input.image);

  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/community/posts/suggestion`, {
      method: "POST",
      headers: {
        ...authHeaders(authToken)
      },
      body: formData
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "community/post-suggestion", "Failed to generate AI suggestion");
  }

  return res.json() as Promise<CommunityPostSuggestion>;
}

export async function fetchNormalizedText(input: {
  token: string;
  text: string;
  field?: "body" | "plant_name";
}): Promise<string> {
  const search = new URLSearchParams({
    text: input.text,
    field: input.field ?? "body"
  });
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/community/normalize-text?${search.toString()}`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "community/normalize-text", "Failed to normalize text");
  }

  const payload = (await res.json()) as {normalized_text: string};
  return payload.normalized_text;
}

export async function fetchNotifications(token: string): Promise<AppNotification[]> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/notifications`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "notifications", "Failed to load notifications");
  }

  return res.json() as Promise<AppNotification[]>;
}

export async function markNotificationRead(input: {token: string; notificationId: string}): Promise<AppNotification> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/notifications/${input.notificationId}/read`, {
      method: "POST",
      headers: {
        ...authHeaders(authToken)
      }
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "notifications/read", "Failed to mark notification as read");
  }

  return res.json() as Promise<AppNotification>;
}

export async function toggleCommunityCommentLike(input: {
  token: string;
  commentId: string;
}): Promise<CommunityPostDetail> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/community/comments/${input.commentId}/like`, {
      method: "POST",
      headers: {
        ...authHeaders(authToken)
      }
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "community/comment-like", "Failed to update comment like");
  }

  return res.json() as Promise<CommunityPostDetail>;
}

export async function fetchSocialOverview(token: string): Promise<SocialOverview> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/social/overview`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "social/overview", "Failed to load social data");
  }

  return res.json() as Promise<SocialOverview>;
}

export async function sendFriendRequest(input: {token: string; receiverId: string}): Promise<FriendRequest> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/social/friend-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(authToken)
      },
      body: JSON.stringify({receiver_id: input.receiverId})
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "social/friend-request-send", "Failed to send friend request");
  }

  return res.json() as Promise<FriendRequest>;
}

export async function acceptFriendRequest(input: {token: string; requestId: string}): Promise<FriendRequest> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/social/friend-requests/${input.requestId}/accept`, {
      method: "POST",
      headers: {
        ...authHeaders(authToken)
      }
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "social/friend-request-accept", "Failed to accept friend request");
  }

  return res.json() as Promise<FriendRequest>;
}

export async function rejectFriendRequest(input: {token: string; requestId: string}): Promise<FriendRequest> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/social/friend-requests/${input.requestId}/reject`, {
      method: "POST",
      headers: {
        ...authHeaders(authToken)
      }
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "social/friend-request-reject", "Failed to update friend request");
  }

  return res.json() as Promise<FriendRequest>;
}

export async function fetchConversation(input: {token: string; friendId: string}): Promise<ConversationData> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/social/conversations/${input.friendId}`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "social/conversation", "Failed to load conversation");
  }

  return res.json() as Promise<ConversationData>;
}

export async function sendDirectMessage(input: {token: string; receiverId: string; body: string}): Promise<DirectMessage> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/social/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(authToken)
      },
      body: JSON.stringify({receiver_id: input.receiverId, body: input.body})
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "social/message-send", "Failed to send message");
  }

  return res.json() as Promise<DirectMessage>;
}
