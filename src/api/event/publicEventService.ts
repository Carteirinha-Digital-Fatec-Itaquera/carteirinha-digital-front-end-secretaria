import { apiRequest } from "../config/apiRequest";
import { privateFetch } from "../config/privateFetch";
import { GLOBAL_VAR } from "../config/globalVar";
import { onSessionClear } from "../auth/session";
export interface Edition {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  published: boolean;
  cpfRequired: boolean;
  courses: string[];
  purgedAt: string | null;
}
export interface Template {
  id: string;
  name: string;
  role: string;
  version: number;
  status: string;
  config: { wordingVersion?: 'LECTURE_LISTENER_2026' | 'LEGACY'; textColor?: string; heading: string; edition: string; backgroundAssetId?: string; design?: 'TECHNOLOGY_BLUE_2026' | 'TECHNOLOGY_BLUE_2026_DARK'; attendeeAction?: string; speakerAction?: string };
}
export interface Signer {
  id: string;
  name: string;
  title: string;
  course?: string;
  assetId?: string;
  archived: boolean;
  version?: number;
}
export interface ManagedEvent {
  id: string;
  title: string;
  status: string;
  seriesId: string | null;
  geoPolicy?: {
    latitude: number;
    longitude: number;
    radius: number;
    maxAccuracy: number;
  } | null;
}
export interface Catalog {
  defaultVenue?: {
    name: string;
    address: string;
    calibrationRequired: boolean;
    policy: {
      latitude: number;
      longitude: number;
      radius: number;
      maxAccuracy: number;
    };
  };
  series: Edition[];
  templates: Template[];
  signers: Signer[];
  events: ManagedEvent[];
}
export interface Participant {
  id: string;
  name: string;
  course: string | null;
  role: string;
  visitorId: string | null;
  attendance: {
    id?: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    status: string;
  } | null;
  certificate: {
    id: string;
    verificationCode: string;
    revokedAt: string | null;
    artifact: { state: string; deliveryState: string } | null;
  } | null;
}
export interface AuditEntry {
  id: string;
  action: string;
  secretaryId: number | null;
  reason: string | null;
  createdAt: string;
}
export const management = <T>(
  path: string,
  body?: unknown,
  method = "POST",
  signal?: AbortSignal,
) =>
  apiRequest<T>(`/event-management/${path}`, {
    method: body === undefined ? "GET" : method,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
export async function uploadAsset(file: File, kind: string) {
  const form = new FormData();
  form.set("file", file);
  return apiRequest<{ id: string }>(`/event-management/assets/${kind}`, {
    method: "POST",
    body: form,
  });
}
export async function openManagementPdf(path: string, body?: unknown) {
  const response = await privateFetch(
    `${GLOBAL_VAR.BASE_URL.replace(/\/$/, "")}/event-management/${path}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Não foi possível gerar o PDF.");
  }
  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = "certificado.pdf";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getManagementPdfBlobUrl(
  path: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<string> {
  const response = await privateFetch(
    `${GLOBAL_VAR.BASE_URL.replace(/\/$/, "")}/event-management/${path}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Não foi possível gerar o PDF de conferência.");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

interface CachedAsset {
  objectUrl: string;
  refCount: number;
}

const assetUrlCache = new Map<string, CachedAsset>();
const inFlightAssetRequests = new Map<string, Promise<string>>();

export async function fetchAssetBlobUrl(
  assetId: string,
  signal?: AbortSignal
): Promise<string> {
  const cached = assetUrlCache.get(assetId);
  if (cached) {
    cached.refCount++;
    return cached.objectUrl;
  }

  const existingRequest = inFlightAssetRequests.get(assetId);
  if (existingRequest) {
    const url = await existingRequest;
    const current = assetUrlCache.get(assetId);
    if (current) current.refCount++;
    return url;
  }

  const fetchPromise = (async () => {
    try {
      const response = await privateFetch(
        `${GLOBAL_VAR.BASE_URL.replace(/\/$/, "")}/event-management/assets/${assetId}`,
        { method: "GET", signal }
      );
      if (!response.ok) {
        throw new Error("Não foi possível carregar a imagem do asset.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      assetUrlCache.set(assetId, { objectUrl, refCount: 1 });
      return objectUrl;
    } finally {
      inFlightAssetRequests.delete(assetId);
    }
  })();

  inFlightAssetRequests.set(assetId, fetchPromise);
  return fetchPromise;
}

export function releaseAssetBlobUrl(idOrUrl: string) {
  let targetId: string | null = null;
  for (const [id, cached] of assetUrlCache.entries()) {
    if (id === idOrUrl || cached.objectUrl === idOrUrl) {
      targetId = id;
      break;
    }
  }

  if (targetId) {
    const cached = assetUrlCache.get(targetId)!;
    cached.refCount--;
    if (cached.refCount <= 0) {
      try {
        URL.revokeObjectURL(cached.objectUrl);
      } catch {
        // Ignora falha de revogação de blob
      }
      assetUrlCache.delete(targetId);
    }
  }
}

export function revokeAssetBlobUrl(assetId: string) {
  const existing = assetUrlCache.get(assetId);
  if (existing) {
    try {
      URL.revokeObjectURL(existing.objectUrl);
    } catch {
      // Ignora falha de revogação de blob
    }
    assetUrlCache.delete(assetId);
  }
}

export function revokeAllAssetBlobUrls() {
  for (const [, cached] of assetUrlCache.entries()) {
    try {
      URL.revokeObjectURL(cached.objectUrl);
    } catch {
      // Ignora falha de revogação de blob
    }
  }
  assetUrlCache.clear();
  inFlightAssetRequests.clear();
}

onSessionClear(() => {
  revokeAllAssetBlobUrls();
});

export interface EventFeedbackItem {
  id: string;
  rating: number;
  comments: string | null;
  suggestions: string | null;
  createdAt: string;
}

export interface EventFeedbackMetrics {
  eventId: string;
  totalResponses: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  feedbacks: EventFeedbackItem[];
}

export const getEventFeedback = (eventId: string, signal?: AbortSignal) =>
  management<EventFeedbackMetrics>(`events/${eventId}/feedback`, undefined, "GET", signal);
