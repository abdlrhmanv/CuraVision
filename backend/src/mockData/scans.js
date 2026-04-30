const { randomUUID } = require("crypto");

/**
 * In-memory store for scans and their derived analysis results.
 * Replaces the PostgreSQL `scans` and `scan_analysis` tables.
 *
 * A scan transitions through:
 *   UPLOADED → ANALYSIS_PENDING → ANALYSIS_RUNNING → ANALYSIS_COMPLETE | FAILED
 */

/** @type {object[]} */
const SCANS = [];

/** @type {Map<string, object>} scan_id -> analysis record */
const ANALYSES = new Map();

function createScan({ patient_id, doctor_id, dicom_path, modality }) {
  const now = new Date().toISOString();
  const scan = {
    id: randomUUID(),
    patient_id,
    doctor_id,
    dicom_path,
    modality: modality || "MRI",
    status: "UPLOADED",
    uploaded_at: now,
    updated_at: now,
  };
  SCANS.push(scan);
  return scan;
}

function getScanById(id) {
  return SCANS.find((s) => s.id === id) ?? null;
}

function listScansByPatient(patientId) {
  return SCANS.filter((s) => s.patient_id === patientId);
}

function listScansByDoctor(doctorId) {
  return SCANS.filter((s) => s.doctor_id === doctorId);
}

function updateScanStatus(id, status) {
  const scan = getScanById(id);
  if (!scan) return null;
  scan.status = status;
  scan.updated_at = new Date().toISOString();
  return scan;
}

function upsertAnalysis(scanId, payload) {
  const existing = ANALYSES.get(scanId);
  const now = new Date().toISOString();
  const record = {
    id: existing?.id ?? randomUUID(),
    scan_id: scanId,
    unet_mask_path: payload.unet_mask_path ?? existing?.unet_mask_path ?? null,
    gradcam_path: payload.gradcam_path ?? existing?.gradcam_path ?? null,
    tumor_volume_cc: payload.tumor_volume_cc ?? existing?.tumor_volume_cc ?? null,
    tumor_location_description:
      payload.tumor_location_description ??
      existing?.tumor_location_description ??
      null,
    inference_log: payload.inference_log ?? existing?.inference_log ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  ANALYSES.set(scanId, record);
  return record;
}

function getAnalysisByScan(scanId) {
  return ANALYSES.get(scanId) ?? null;
}

module.exports = {
  SCANS,
  ANALYSES,
  createScan,
  getScanById,
  listScansByPatient,
  listScansByDoctor,
  updateScanStatus,
  upsertAnalysis,
  getAnalysisByScan,
};
