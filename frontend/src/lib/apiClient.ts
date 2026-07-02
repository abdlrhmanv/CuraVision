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
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setToken(token: string | null): void {
  // Rely on HttpOnly cookies, do not persist token in LocalStorage to prevent XSS
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

  if (typeof document !== "undefined") {
    const xsrfCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="));
    if (xsrfCookie) {
      requestHeaders["X-XSRF-TOKEN"] = xsrfCookie.split("=")[1] || "";
    }
  }

  let payload: BodyInit | undefined;
  if (formData) payload = body as FormData;
  else if (body !== undefined) payload = JSON.stringify(body);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: payload,
    credentials: "include",
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
    
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const isAuthPage =
          path.startsWith("/login") ||
          path.startsWith("/register") ||
          path.startsWith("/forgot-password") ||
          path.startsWith("/reset-password") ||
          path.startsWith("/verify-email");

        if (!isAuthPage) {
          clearSession();
          window.location.href = "/login?expired=true";
        }
      }
    }

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

  logout: () => api.post<{ ok: boolean }>("/api/auth/logout"),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/api/auth/forgot-password", { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>("/api/auth/reset-password", { token, new_password: newPassword }),
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

export interface AvailabilityRule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
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
    api.get<{ doctors: Array<{ id: string; full_name: string; email: string; role: "DOCTOR"; specialization?: string }> }>("/api/doctors"),
  getRules: (doctorId: string) =>
    api.get<{ rules: AvailabilityRule[] }>(`/api/doctors/${doctorId}/availability/rules`),
  createRule: (doctorId: string, rule: { day_of_week: number; start_time: string; end_time: string }) =>
    api.post<{ rule: AvailabilityRule }>(`/api/doctors/${doctorId}/availability/rules`, rule),
  deleteRule: (doctorId: string, ruleId: string) =>
    api.delete<{ ok: boolean }>(`/api/doctors/${doctorId}/availability/rules/${ruleId}`),
};

export interface User {
  id: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  full_name: string;
  status?: "ACTIVE" | "DISABLED";
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  status?: "ACTIVE" | "INACTIVE";
  created_at: string;
  updated_at?: string;
  last_scan_date?: string;
  total_scans: number;
  pending_reports: number;
}

export const patientsApi = {
  list: () => api.get<{ patients: Patient[] }>("/api/patients"),
  get: (id: string) => api.get<Patient>(`/api/patients/${id}`),
  listForDoctor: (doctorId: string) =>
    api.get<{ patients: Patient[] }>(`/api/doctors/${doctorId}/patients`),
  update: (id: string, updates: Partial<Patient>) =>
    api.patch<Patient>(`/api/patients/${id}`, updates),
};

export interface PatientStats {
  total_scans: number;
  total_reports: number;
  total_appointments: number;
}

export const patientApi = {
  getStats: () => api.get<PatientStats>("/api/patient/stats"),
  getReports: () => reportsApi.listForPatient(),
  getScans: () => api.get<{ scans: Scan[] }>("/api/patient/scans"),
  uploadScan: (file: File, doctorId: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doctor_id", doctorId);
    return api.upload<{ scan_id: string; status: string }>("/api/patient/scans", fd);
  },
};

export const adminApi = {
  listUsers: (params?: {
    query?: string;
    role?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set('query', params.query);
    if (params?.role) searchParams.set('role', params.role);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return api.get<{ users: User[]; total: number }>(`/api/admin/users${query ? `?${query}` : ''}`);
  },

  updateUser: (userId: string, updates: Partial<User>) =>
    api.patch<User>(`/api/admin/users/${userId}`, updates),

  getAuditLogs: (params?: {
    user_id?: string;
    action?: string;
    entity_type?: string;
    entity_id?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.user_id) searchParams.set('user_id', params.user_id);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.entity_type) searchParams.set('entity_type', params.entity_type);
    if (params?.entity_id) searchParams.set('entity_id', params.entity_id);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return api.get<{ logs: AuditLog[]; total: number }>(`/api/admin/audit-logs${query ? `?${query}` : ''}`);
  },
};
