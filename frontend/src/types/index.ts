export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

export interface User {
  id: string;
  email: string;
  role: Role;
  full_name: string;
}

export interface Scan {
  id: string;
  patient_id: string;
  doctor_id: string;
  dicom_path: string | null;
  modality: string;
  status: "UPLOADED" | "ANALYSIS_PENDING" | "ANALYSIS_RUNNING" | "ANALYSIS_COMPLETE" | "FAILED";
  uploaded_at: string;
  patient_name?: string;
  report_id?: string | null;
  report_status?: string | null;
}

export interface ScanAnalysis {
  scan_id: string;
  unet_mask_path: string | null;
  gradcam_path: string | null;
  tumor_volume_cc: number | null;
  tumor_location_description: string | null;
  inference_log: string | null;
}

export interface Report {
  id: string;
  scan_id: string;
  patient_id: string;
  doctor_id: string;
  status: "DRAFT" | "REVIEWED" | "PUBLISHED";
  patient_visible: boolean;
  ai_draft: string;
  final_report: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportCorrection {
  field: string;
  old_value: string;
  new_value: string;
}

export interface Reservation {
  id: string;
  doctor_id: string;
  patient_id: string;
  start_time: string;
  end_time: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
}

export interface PatientStats {
  total_scans: number;
  total_reports: number;
  total_appointments: number;
}

export interface AvailabilityRule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

