/**
 * Thin wrapper around `fetch` for talking to the CuraVision Node backend.
 *
 *   - Reads the JWT from localStorage (`curavision_token`) and attaches it
 *     as `Authorization: Bearer ...` on every request.
 *   - Serializes JSON bodies and sets Accept/Content-Type appropriately.
 *   - Normalizes errors into a typed `ApiError` so UI code can branch on
 *     `status` / `code` instead of string-matching.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const TOKEN_STORAGE_KEY = "curavision_token";
const USER_STORAGE_KEY = "curavision_user";

export interface AuthUser {
  id: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  full_name: string;
  status?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_STORAGE_KEY);
}

export function clearSession(): void {
  setToken(null);
  setStoredUser(null);
}

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
  /** When true, send the body as `FormData` unchanged (for multipart uploads). */
  formData?: boolean;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, headers = {}, formData, ...rest } = opts;
  const token = getToken();

  const requestHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  if (!formData && body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  let payload: BodyInit | undefined;
  if (formData) payload = body as FormData;
  else if (body !== undefined) payload = JSON.stringify(body);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: payload,
  });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const d = (data ?? {}) as { code?: string; message?: string; errors?: unknown };
    throw new ApiError(
      res.status,
      d.code ?? "HTTP_ERROR",
      d.message ?? res.statusText,
      d.errors
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form, formData: true }),
};

// ── Typed endpoint helpers ────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { email, password }),

  register: (input: {
    email: string;
    password: string;
    full_name: string;
    role?: "PATIENT" | "DOCTOR";
  }) => api.post<LoginResponse>("/api/auth/register", input),
};

export interface Scan {
  id: string;
  patient_id: string;
  doctor_id: string;
  dicom_path: string | null;
  modality: string;
  status: string;
  uploaded_at: string;
  updated_at: string;
}

export interface ScanAnalysis {
  scan_id: string;
  unet_mask_path: string | null;
  gradcam_path: string | null;
  tumor_volume_cc: number | null;
  tumor_location_description: string | null;
  inference_log: string | null;
}

export interface DoctorScan extends Scan {
  patient_name: string | null;
  report_id: string | null;
  report_status: string | null;
}

export const scansApi = {
  upload: (file: File, patientId: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("patient_id", patientId);
    return api.upload<{ scan_id: string; status: string }>("/api/scans", fd);
  },
  get: (id: string) => api.get<Scan>(`/api/scans/${id}`),
  analysis: (id: string) => api.get<ScanAnalysis>(`/api/scans/${id}/analysis`),
  reportForScan: (id: string) => api.get<Report>(`/api/scans/${id}/report`),
  listForDoctor: () => api.get<{ scans: DoctorScan[] }>("/api/scans"),
  listForPatient: (patientId: string) =>
    api.get<{ patient_id: string; scans: Scan[] }>(
      `/api/patients/${patientId}/scans`
    ),
};

export interface Report {
  id: string;
  scan_id: string;
  patient_id: string;
  doctor_id: string;
  status: "DRAFT" | "REVIEWED" | "PUBLISHED";
  patient_visible: boolean;
  ai_draft?: string;
  final_report: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportCorrection {
  id: string;
  report_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export const reportsApi = {
  patch: (id: string, patch: { final_report?: string; corrections?: unknown[] }) =>
    api.patch<Report>(`/api/reports/${id}`, patch),
  approve: (id: string) => api.post<Report>(`/api/reports/${id}/approve`),
  listForPatient: () =>
    api.get<{ reports: Report[] }>("/api/patient/reports"),
  getForPatient: (id: string) => api.get<Report>(`/api/patient/reports/${id}`),
  corrections: (id: string) =>
    api.get<{ report_id: string; corrections: ReportCorrection[] }>(
      `/api/reports/${id}/corrections`
    ),
};

export interface ChatMessage {
  id: string;
  sender: "PATIENT" | "BOT";
  message: string;
  created_at: string;
}

export const chatApi = {
  send: (reportId: string, message: string) =>
    api.post<{ session_id: string; reply: string; sources: string[] }>(
      `/api/chat/${reportId}/message`,
      { message }
    ),
  history: (reportId: string) =>
    api.get<{ session_id: string; messages: ChatMessage[] }>(
      `/api/chat/${reportId}/history`
    ),
};

export interface Reservation {
  id: string;
  doctor_id: string;
  patient_id: string;
  start_time: string;
  end_time: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  created_at: string;
  updated_at: string;
}

export const reservationsApi = {
  list: () => api.get<{ reservations: Reservation[] }>("/api/reservations"),
  book: (doctor_id: string, start_time: string, end_time: string) =>
    api.post<Reservation>("/api/reservations", { doctor_id, start_time, end_time }),
  updateStatus: (id: string, status: Reservation["status"]) =>
    api.patch<Reservation>(`/api/reservations/${id}`, { status }),
  doctorAvailability: (doctorId: string, from: string, to: string) =>
    api.get<{
      doctor_id: string;
      from: string;
      to: string;
      slots: { start_time: string; end_time: string }[];
    }>(`/api/doctors/${doctorId}/availability?from=${from}&to=${to}`),
  listDoctors: () =>
    api.get<{ doctors: AuthUser[] }>("/api/doctors"),
};
