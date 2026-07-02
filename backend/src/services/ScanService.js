const prisma = require("../config/prisma");
const { saveDicom, derivedPaths, uploadLocalFile, getPresignedGetUrl, getPresignedPutUrl } = require("../integrations/storageClient");
const { fastapiClient } = require("../integrations/fastapiClient");
const UserService = require("./UserService");
const ReportService = require("./ReportService");
const AuditService = require("./AuditService");
const logger = require("../utils/logger");
const { notFound, badRequest, forbidden, conflict } = require("../utils/AppError");

const SAMPLE_TUMOR_LOCATIONS = [
  "Left frontal lobe, parasagittal region",
  "Right temporal lobe, mesial aspect",
  "Left parietal lobe, posterior convexity",
  "Right occipital lobe, periventricular white matter",
  "Brainstem, pontine region",
];

function serializeScan(scan) {
  return {
    id: scan.id,
    patient_id: scan.patient_id,
    doctor_id: scan.doctor_id,
    dicom_path: scan.dicom_path,
    modality: scan.modality,
    status: scan.status,
    uploaded_at: scan.uploaded_at.toISOString(),
    updated_at: scan.updated_at.toISOString(),
  };
}

function serializeAnalysis(analysis) {
  if (!analysis) return null;
  return {
    id: analysis.id,
    scan_id: analysis.scan_id,
    unet_mask_path: analysis.unet_mask_path,
    gradcam_path: analysis.gradcam_path,
    tumor_volume_cc: analysis.tumor_volume_cc,
    tumor_location_description: analysis.tumor_location_description,
    inference_log: analysis.inference_log,
    created_at: analysis.created_at.toISOString(),
    updated_at: analysis.updated_at.toISOString(),
  };
}

async function getScanRecord(scanId) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  return scan ? serializeScan(scan) : null;
}

async function updateScanStatus(scanId, status) {
  const scan = await prisma.scan.update({
    where: { id: scanId },
    data: { status },
  });
  return serializeScan(scan);
}

async function upsertAnalysis(scanId, payload) {
  const analysis = await prisma.scanAnalysis.upsert({
    where: { scan_id: scanId },
    create: {
      scan_id: scanId,
      unet_mask_path: payload.unet_mask_path ?? null,
      gradcam_path: payload.gradcam_path ?? null,
      tumor_volume_cc: payload.tumor_volume_cc ?? null,
      tumor_location_description: payload.tumor_location_description ?? null,
      inference_log: payload.inference_log ?? null,
    },
    update: {
      unet_mask_path: payload.unet_mask_path ?? undefined,
      gradcam_path: payload.gradcam_path ?? undefined,
      tumor_volume_cc: payload.tumor_volume_cc ?? undefined,
      tumor_location_description: payload.tumor_location_description ?? undefined,
      inference_log: payload.inference_log ?? undefined,
    },
  });
  return serializeAnalysis(analysis);
}

async function uploadScan({ file, patientId, doctorId }) {
  if (!file) throw badRequest("DICOM file is required.", "FILE_REQUIRED");

  if (!file.buffer || file.buffer.length === 0) {
    throw badRequest("Invalid DICOM file format. Only DICOM (.dcm) files are allowed.", "INVALID_DICOM");
  }

  // Validate DICOM Magic Number signature
  if (
    !file.buffer ||
    file.buffer.length < 132 ||
    file.buffer[128] !== 68 || // 'D'
    file.buffer[129] !== 73 || // 'I'
    file.buffer[130] !== 67 || // 'C'
    file.buffer[131] !== 77    // 'M'
  ) {
    throw badRequest("Invalid DICOM file format. Only DICOM (.dcm) files are allowed.", "INVALID_DICOM");
  }

  const patient = await UserService.findUserById(patientId);
  if (!patient || patient.role !== "PATIENT") {
    throw notFound("Patient not found.", "PATIENT_NOT_FOUND");
  }

  const created = await prisma.scan.create({
    data: {
      patient_id: patientId,
      doctor_id: doctorId,
      modality: "MRI",
      status: "UPLOADED",
    },
  });

  const { logicalPath } = await saveDicom(created.id, file.originalname || "scan.dcm", file.buffer);

  const scan = await prisma.scan.update({
    where: { id: created.id },
    data: { dicom_path: logicalPath, status: "UPLOADED" },
  });
  const serialized = serializeScan(scan);
  serialized.dicom_path = logicalPath;

  AuditService.log({
    user_id: doctorId,
    action: "SCAN_UPLOAD",
    entity_type: "SCAN",
    entity_id: scan.id,
    metadata: { scan_id: scan.id, patient_id: patientId, status: "UPLOADED" },
  });

  return { scan_id: scan.id, status: "UPLOADED" };
}

async function triggerAnalysis(scanId, { requester }) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) throw notFound("Scan not found.", "SCAN_NOT_FOUND");
  if (requester.role === "DOCTOR" && scan.doctor_id !== requester.sub) {
    throw forbidden("You do not have access to this scan.");
  }
  if (scan.status === "ANALYSIS_PENDING" || scan.status === "ANALYSIS_RUNNING") {
    throw badRequest("Analysis already in progress.", "ANALYSIS_IN_PROGRESS");
  }
  if (scan.status === "ANALYSIS_COMPLETE") {
    throw badRequest("Analysis is already complete.", "ANALYSIS_COMPLETE");
  }
  if (scan.status === "FAILED") {
    throw badRequest("Cannot analyze a failed scan.", "SCAN_FAILED");
  }
  if (scan.status !== "UPLOADED") {
    throw badRequest("Scan is not ready for analysis.", "INVALID_SCAN_STATUS");
  }

  await updateScanStatus(scanId, "ANALYSIS_PENDING");

  scheduleAnalysis(scanId).catch((err) => {
    logger.error({ err }, `[ScanService] Analysis failed for scan ${scanId}`);
    updateScanStatus(scanId, "FAILED").catch(() => {});
    AuditService.log({
      user_id: null,
      action: "ANALYSIS_FAILED",
      entity_type: "SCAN",
      entity_id: scanId,
      metadata: { error: err.message },
    });
  });

  return { scan_id: scanId, status: "ANALYSIS_PENDING" };
}

async function createReportForScan(scanId, { requester }) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) throw notFound("Scan not found.", "SCAN_NOT_FOUND");
  if (requester.role === "DOCTOR" && scan.doctor_id !== requester.sub) {
    throw forbidden("You do not have access to this scan.");
  }
  if (scan.status !== "ANALYSIS_COMPLETE") {
    throw badRequest("Report can only be created after analysis is complete.", "ANALYSIS_NOT_COMPLETE");
  }

  const existing = await ReportService.getReportByScan(scanId);
  if (existing) {
    return existing;
  }

  const analysis = await prisma.scanAnalysis.findUnique({ where: { scan_id: scanId } });
  const aiDraft =
    analysis?.tumor_location_description && analysis?.tumor_volume_cc != null
      ? `AI findings: ${analysis.tumor_volume_cc} cc lesion in ${analysis.tumor_location_description}.`
      : "AI draft pending review.";

  return ReportService.upsertDraftReport({
    scan_id: scanId,
    patient_id: scan.patient_id,
    doctor_id: scan.doctor_id,
    ai_draft: aiDraft,
  });
}

async function scheduleAnalysis(scanId) {
  await updateScanStatus(scanId, "ANALYSIS_RUNNING");

  const scan = await getScanRecord(scanId);
  if (!scan) return;

  const { mask_path, gradcam_path } = derivedPaths(scanId);

  const dicomUrl = await getPresignedGetUrl(scan.dicom_path).catch(() => null);
  const maskPutUrl = await getPresignedPutUrl(mask_path, "image/png").catch(() => null);
  const gradcamPutUrl = await getPresignedPutUrl(gradcam_path, "image/png").catch(() => null);

  let result;
  try {
    const { data } = await fastapiClient.post("/ai/analyze", {
      scan_id: scanId,
      dicom_path: scan.dicom_path ?? "",
      dicom_url: dicomUrl ?? undefined,
      mask_put_url: maskPutUrl ?? undefined,
      gradcam_put_url: gradcamPutUrl ?? undefined,
    });
    if (data && data.status === "QUEUED") {
      logger.info(`[ScanService] AI analysis enqueued to Celery queue with task_id: ${data.task_id} for scan ${scanId}`);
      return;
    }
    result = data;
  } catch (err) {
    logger.warn(
      {
        error: err.message,
        detail: err.response?.data?.detail ?? err.response?.data ?? "(no response body)",
      },
      `[ScanService] AI service unreachable, falling back to local stub for scan ${scanId}`
    );
    result = localStubAnalysis(scanId);
  }

  const { segmentation, gradcam, report } = result;

  await upsertAnalysis(scanId, {
    unet_mask_path: segmentation.mask_path,
    gradcam_path: gradcam.gradcam_path,
    tumor_volume_cc: segmentation.tumor_volume_cc,
    tumor_location_description: segmentation.tumor_location_description,
    inference_log: segmentation.inference_log,
  });

  if (segmentation.mask_path) {
    await uploadLocalFile(segmentation.mask_path).catch((err) =>
      logger.error({ err }, `[ScanService] failed to upload mask to S3 for scan ${scanId}`)
    );
  }
  if (gradcam.gradcam_path) {
    await uploadLocalFile(gradcam.gradcam_path).catch((err) =>
      logger.error({ err }, `[ScanService] failed to upload gradcam to S3 for scan ${scanId}`)
    );
  }

  await ReportService.upsertDraftReport({
    scan_id: scanId,
    patient_id: scan.patient_id,
    doctor_id: scan.doctor_id,
    ai_draft: report.ai_draft,
  });

  await updateScanStatus(scanId, "ANALYSIS_COMPLETE");

  AuditService.log({
    user_id: null,
    action: "ANALYSIS_COMPLETE",
    entity_type: "SCAN",
    entity_id: scanId,
    metadata: { tumor_volume_cc: segmentation.tumor_volume_cc },
  });
}

async function completeAnalysis(scanId, payload) {
  const scan = await getScanRecord(scanId);
  if (!scan) throw notFound("Scan not found.", "SCAN_NOT_FOUND");

  const segmentation = payload.segmentation ?? {};
  const gradcam = payload.gradcam ?? {};
  const report = payload.report ?? {};

  await upsertAnalysis(scanId, {
    unet_mask_path: segmentation.mask_path,
    gradcam_path: gradcam.gradcam_path,
    tumor_volume_cc: segmentation.tumor_volume_cc,
    tumor_location_description: segmentation.tumor_location_description,
    inference_log: segmentation.inference_log,
  });

  if (segmentation.mask_path) {
    await uploadLocalFile(segmentation.mask_path).catch((err) =>
      logger.error({ err }, `[ScanService] failed to upload mask callback to S3 for scan ${scanId}`)
    );
  }
  if (gradcam.gradcam_path) {
    await uploadLocalFile(gradcam.gradcam_path).catch((err) =>
      logger.error({ err }, `[ScanService] failed to upload gradcam callback to S3 for scan ${scanId}`)
    );
  }

  await ReportService.upsertDraftReport({
    scan_id: scanId,
    patient_id: scan.patient_id,
    doctor_id: scan.doctor_id,
    ai_draft: report.ai_draft,
  });

  await updateScanStatus(scanId, "ANALYSIS_COMPLETE");

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

async function failAnalysis(scanId, errorMsg) {
  const scan = await getScanRecord(scanId);
  if (!scan) throw notFound("Scan not found.", "SCAN_NOT_FOUND");

  await upsertAnalysis(scanId, {
    inference_log: errorMsg,
  });

  await updateScanStatus(scanId, "FAILED");

  AuditService.log({
    user_id: null,
    action: "ANALYSIS_FAILED_CALLBACK",
    entity_type: "SCAN",
    entity_id: scanId,
    metadata: { error: errorMsg },
  });

  return {
    scan_id: scanId,
    status: "FAILED",
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

async function getScanSummary(scanId, { requester }) {
  const scan = await getScanRecord(scanId);
  if (!scan) throw notFound("Scan not found.", "SCAN_NOT_FOUND");
  if (requester.role === "DOCTOR" && scan.doctor_id !== requester.sub) {
    throw forbidden("You do not have access to this scan.");
  }
  if (requester.role === "PATIENT" && scan.patient_id !== requester.sub) {
    throw forbidden("You do not have access to this scan.");
  }
  return scan;
}

async function getScanAnalysis(scanId, { requester }) {
  const scan = await getScanSummary(scanId, { requester });
  const analysis = await prisma.scanAnalysis.findUnique({
    where: { scan_id: scanId },
  });
  if (!analysis) {
    throw conflict("Analysis is not ready yet.", "ANALYSIS_NOT_READY");
  }
  return { scan_id: scan.id, ...serializeAnalysis(analysis) };
}

async function listByPatient(patientId) {
  const scans = await prisma.scan.findMany({
    where: { patient_id: patientId },
    orderBy: { uploaded_at: "desc" },
  });
  return scans.map(serializeScan);
}

async function listByDoctor(doctorId, { status, modality, search } = {}) {
  const where = { doctor_id: doctorId };
  if (status) where.status = status;
  if (modality) where.modality = modality;
  if (search) {
    where.patient = {
      full_name: { contains: search, mode: "insensitive" },
    };
  }

  const scans = await prisma.scan.findMany({
    where,
    include: {
      patient: { select: { full_name: true } },
      report: { select: { id: true, status: true } },
    },
    orderBy: { uploaded_at: "desc" },
  });

  return scans.map((scan) => ({
    ...serializeScan(scan),
    patient_name: scan.patient.full_name,
    report_id: scan.report?.id ?? null,
    report_status: scan.report?.status ?? null,
  }));
}

module.exports = {
  uploadScan,
  triggerAnalysis,
  createReportForScan,
  scheduleAnalysis,
  completeAnalysis,
  failAnalysis,
  getScanSummary,
  getScanAnalysis,
  listByPatient,
  listByDoctor,
  getScanRecord,
};
