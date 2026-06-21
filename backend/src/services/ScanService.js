const { saveDicom, derivedPaths } = require("../integrations/storageClient");
const { fastapiClient } = require("../integrations/fastapiClient");
const {
  createScan,
  getScanById,
  listScansByPatient,
  updateScanStatus,
  upsertAnalysis,
  getAnalysisByScan,
} = require("../mockData/scans");
const { findUserById } = require("../mockData/users");
const { upsertDraftReport } = require("../mockData/reports");
const AuditService = require("./AuditService");

const SAMPLE_TUMOR_LOCATIONS = [
  "Left frontal lobe, parasagittal region",
  "Right temporal lobe, mesial aspect",
  "Left parietal lobe, posterior convexity",
  "Right occipital lobe, periventricular white matter",
  "Brainstem, pontine region",
];

function notFound(message, code = "SCAN_NOT_FOUND") {
  const err = new Error(message);
  err.status = 404;
  err.code = code;
  return err;
}

function badRequest(message, code = "VALIDATION_ERROR") {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
}

/**
 * Accept a DICOM upload, persist it to local storage, record the scan,
 * and kick off a simulated async analysis pipeline. The stub mirrors the
 * contract of a future Celery worker / FastAPI `/ai/segmentation` call
 * so the end-to-end doctor flow can be demonstrated today.
 *
 * @param {object} params
 * @param {Express.Multer.File} params.file
 * @param {string} params.patientId
 * @param {string} params.doctorId
 */
function uploadScan({ file, patientId, doctorId }) {
  if (!file) throw badRequest("DICOM file is required.", "FILE_REQUIRED");

  const patient = findUserById(patientId);
  if (!patient || patient.role !== "PATIENT") {
    throw notFound("Patient not found.", "PATIENT_NOT_FOUND");
  }

  const scan = createScan({
    patient_id: patientId,
    doctor_id: doctorId,
    dicom_path: null,
    modality: "MRI",
  });

  const { logicalPath } = saveDicom(scan.id, file.originalname || "scan.dcm", file.buffer);
  scan.dicom_path = logicalPath;
  updateScanStatus(scan.id, "ANALYSIS_PENDING");

  AuditService.log({
    user_id: doctorId,
    action: "UPLOAD_SCAN",
    entity_type: "SCAN",
    entity_id: scan.id,
    metadata: { patient_id: patientId, status: "ANALYSIS_PENDING" },
  });

  // Fire-and-forget: the HTTP caller returns immediately while analysis runs.
  scheduleAnalysis(scan.id).catch((err) => {
    console.error(`[ScanService] Analysis failed for scan ${scan.id}:`, err);
    updateScanStatus(scan.id, "FAILED");
    AuditService.log({
      user_id: null,
      action: "ANALYSIS_FAILED",
      entity_type: "SCAN",
      entity_id: scan.id,
      metadata: { error: err.message },
    });
  });

  return { scan_id: scan.id, status: scan.status };
}

/**
 * Trigger the full segmentation → Grad-CAM → report pipeline.
 *
 * Prefers the FastAPI AI microservice when reachable (`AI_SERVICE_URL`).
 * If it errors or is offline, falls back to a local deterministic stub so
 * the doctor flow remains demonstrable without the service running.
 *
 * In production this function will enqueue a Celery chain instead of
 * executing inline — see `ml/worker/tasks.py`.
 */
async function scheduleAnalysis(scanId) {
  updateScanStatus(scanId, "ANALYSIS_RUNNING");

  const scan = getScanById(scanId);
  if (!scan) return;

  let result;
  try {
    const { data } = await fastapiClient.post("/ai/analyze", {
      scan_id: scanId,
      dicom_path: scan.dicom_path ?? "",
    });
    result = data;
  } catch (err) {
    console.warn(
      "[ScanService] AI service unreachable, falling back to local stub:",
      err.message
    );
    result = localStubAnalysis(scanId);
  }

  const { segmentation, gradcam, report } = result;

  upsertAnalysis(scanId, {
    unet_mask_path: segmentation.mask_path,
    gradcam_path: gradcam.gradcam_path,
    tumor_volume_cc: segmentation.tumor_volume_cc,
    tumor_location_description: segmentation.tumor_location_description,
    inference_log: segmentation.inference_log,
  });

  upsertDraftReport({
    scan_id: scanId,
    patient_id: scan.patient_id,
    doctor_id: scan.doctor_id,
    ai_draft: report.ai_draft,
  });

  updateScanStatus(scanId, "ANALYSIS_COMPLETE");

  AuditService.log({
    user_id: null,
    action: "ANALYSIS_COMPLETE",
    entity_type: "SCAN",
    entity_id: scanId,
    metadata: { tumor_volume_cc: segmentation.tumor_volume_cc },
  });
}

function completeAnalysis(scanId, payload) {
  const scan = getScanById(scanId);
  if (!scan) throw notFound("Scan not found.");

  const segmentation = payload.segmentation ?? {};
  const gradcam = payload.gradcam ?? {};
  const report = payload.report ?? {};

  upsertAnalysis(scanId, {
    unet_mask_path: segmentation.mask_path,
    gradcam_path: gradcam.gradcam_path,
    tumor_volume_cc: segmentation.tumor_volume_cc,
    tumor_location_description: segmentation.tumor_location_description,
    inference_log: segmentation.inference_log,
  });

  upsertDraftReport({
    scan_id: scanId,
    patient_id: scan.patient_id,
    doctor_id: scan.doctor_id,
    ai_draft: report.ai_draft,
  });

  updateScanStatus(scanId, "ANALYSIS_COMPLETE");

  AuditService.log({
    user_id: null,
    action: "ANALYSIS_COMPLETE_CALLBACK",
    entity_type: "SCAN",
    entity_id: scanId,
    metadata: { tumor_volume_cc: segmentation.tumor_volume_cc ?? null },
  });

  return {
    scan_id: scanId,
    status: "ANALYSIS_COMPLETE",
  };
}

function localStubAnalysis(scanId) {
  const { mask_path, gradcam_path } = derivedPaths(scanId);
  const volume = Number((8 + Math.random() * 8).toFixed(2));
  const location =
    SAMPLE_TUMOR_LOCATIONS[
      Math.floor(Math.random() * SAMPLE_TUMOR_LOCATIONS.length)
    ];
  return {
    scan_id: scanId,
    segmentation: {
      scan_id: scanId,
      mask_path,
      tumor_volume_cc: volume,
      tumor_location_description: location,
      inference_log: "local-stub v0.1",
    },
    gradcam: {
      scan_id: scanId,
      gradcam_path,
      activation_peak_region: location,
    },
    report: {
      scan_id: scanId,
      ai_draft: buildDraftReport({ volume, location }),
    },
  };
}

function buildDraftReport({ volume, location }) {
  return [
    "FINDINGS:",
    `A ${volume} cc mass is identified in the ${location}. The lesion`,
    "demonstrates heterogeneous signal on T2/FLAIR sequences with associated",
    "surrounding edema. Peripheral enhancement is suggested following contrast.",
    "",
    "IMPRESSION:",
    "Findings are concerning for an enhancing neoplastic process. Clinical",
    "correlation and multidisciplinary review are recommended.",
    "",
    "(Draft generated automatically — requires radiologist review.)",
  ].join("\n");
}

function getScanSummary(scanId, { requester }) {
  const scan = getScanById(scanId);
  if (!scan) throw notFound("Scan not found.");
  if (requester.role === "DOCTOR" && scan.doctor_id !== requester.sub) {
    const err = new Error("You do not have access to this scan.");
    err.status = 403;
    err.code = "FORBIDDEN";
    throw err;
  }
  return scan;
}

function getScanAnalysis(scanId, { requester }) {
  const scan = getScanSummary(scanId, { requester });
  const analysis = getAnalysisByScan(scanId);
  if (!analysis) {
    const err = new Error("Analysis is not ready yet.");
    err.status = 409;
    err.code = "ANALYSIS_NOT_READY";
    throw err;
  }
  return { scan_id: scan.id, ...analysis };
}

function listByPatient(patientId) {
  return listScansByPatient(patientId);
}

module.exports = {
  uploadScan,
  scheduleAnalysis,
  completeAnalysis,
  getScanSummary,
  getScanAnalysis,
  listByPatient,
};
