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
  config: { heading: string; edition: string; backgroundAssetId?: string };
}
export interface Signer {
  id: string;
  name: string;
  title: string;
  course?: string;
  assetId?: string;
  archived: boolean;
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

const assetUrlCache = new Map<string, string>();

export async function fetchAssetBlobUrl(
  assetId: string,
  signal?: AbortSignal
): Promise<string> {
  if (assetUrlCache.has(assetId)) {
    return assetUrlCache.get(assetId)!;
  }
  const response = await privateFetch(
    `${GLOBAL_VAR.BASE_URL.replace(/\/$/, "")}/event-management/assets/${assetId}`,
    { method: "GET", signal }
  );
  if (!response.ok) {
    throw new Error("Não foi possível carregar a imagem do asset.");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  assetUrlCache.set(assetId, objectUrl);
  return objectUrl;
}

export function revokeAssetBlobUrl(assetId: string) {
  const existing = assetUrlCache.get(assetId);
  if (existing) {
    URL.revokeObjectURL(existing);
    assetUrlCache.delete(assetId);
  }
}

export function revokeAllAssetBlobUrls() {
  for (const [, url] of assetUrlCache.entries()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignora falha de revogação de blob
    }
  }
  assetUrlCache.clear();
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
