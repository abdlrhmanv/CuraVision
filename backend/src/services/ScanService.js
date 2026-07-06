const prisma = require("../config/prisma");
const { saveDicom, derivedPaths, uploadLocalFile, getPresignedGetUrl, getPresignedPutUrl } = require("../integrations/storageClient");
const { fastapiClient } = require("../integrations/fastapiClient");
const UserService = require("./UserService");
const ReportService = require("./ReportService");
const AuditService = require("./AuditService");
const NotificationService = require("./NotificationService");
const logger = require("../utils/logger");
const { notFound, badRequest, forbidden, conflict } = require("../utils/AppError");

const HUMAN_REVIEW_CONFIDENCE = "Not available — human review required";

async function serializeScan(scan) {
  const { isS3Enabled } = require("../integrations/storageClient");
  let dicom_path = scan.dicom_path;
  if (dicom_path && isS3Enabled()) {
    dicom_path = await getPresignedGetUrl(dicom_path);
  }

  return {
    id: scan.id,
    patient_id: scan.patient_id,
    doctor_id: scan.doctor_id,
    dicom_path,
    modality: scan.modality,
    status: scan.status,
    uploaded_at: scan.uploaded_at.toISOString(),
    updated_at: scan.updated_at.toISOString(),
  };
}

async function serializeAnalysis(analysis) {
  if (!analysis) return null;
  const { isS3Enabled } = require("../integrations/storageClient");
  
  let unet_mask_path = analysis.unet_mask_path;
  let gradcam_path = analysis.gradcam_path;

  if (isS3Enabled()) {
    if (unet_mask_path) unet_mask_path = await getPresignedGetUrl(unet_mask_path);
    if (gradcam_path) gradcam_path = await getPresignedGetUrl(gradcam_path);
  }

  return {
    id: analysis.id,
    scan_id: analysis.scan_id,
    unet_mask_path,
    gradcam_path,
    tumor_volume_cc: analysis.tumor_volume_cc,
    tumor_location_description: analysis.tumor_location_description,
    inference_log: analysis.inference_log,
    confidence: analysis.confidence,
    tumor_type: analysis.tumor_type,
    risk_level: analysis.risk_level,
    estimated_diameter: analysis.estimated_diameter,
    brain_hemisphere: analysis.brain_hemisphere,
    lobe: analysis.lobe,
    segmentation_quality: analysis.segmentation_quality,
    growth_pct: analysis.growth_pct,
    suggested_action: analysis.suggested_action,
    processing_time_sec: analysis.processing_time_sec,
    created_at: analysis.created_at.toISOString(),
    updated_at: analysis.updated_at.toISOString(),
  };
}

const scanCache = new Map();
const listCache = new Map();

function clearCache(doctorId, scanId) {
  if (scanId) scanCache.delete(scanId);
  if (doctorId) listCache.delete(doctorId);
}

async function getScanRecord(scanId) {
  if (scanCache.has(scanId)) return scanCache.get(scanId);
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      patient: { select: { full_name: true } },
    },
  });
  if (!scan) return null;
  const serialized = await serializeScan(scan);
  const result = {
    ...serialized,
    patient_name: scan.patient?.full_name ?? null,
  };
  scanCache.set(scanId, result);
  return result;
}

async function updateScanStatus(scanId, status) {
  const scan = await prisma.scan.update({
    where: { id: scanId },
    data: { status },
  });
  clearCache(scan.doctor_id, scanId);
  return await serializeScan(scan);
}

async function upsertAnalysis(scanId, payload) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  
  let growth_pct = null;
  if (scan && payload.tumor_volume_cc != null) {
    const prevScan = await prisma.scan.findFirst({
      where: {
        patient_id: scan.patient_id,
        status: "ANALYSIS_COMPLETE",
        id: { not: scanId },
        uploaded_at: { lt: scan.uploaded_at },
      },
      orderBy: { uploaded_at: "desc" },
      include: { analysis: true },
    });
    if (prevScan?.analysis?.tumor_volume_cc != null) {
      const prevVolume = prevScan.analysis.tumor_volume_cc;
      growth_pct = parseFloat((((payload.tumor_volume_cc - prevVolume) / prevVolume) * 100).toFixed(1));
    }
  }

  const analysis = await prisma.scanAnalysis.upsert({
    where: { scan_id: scanId },
    create: {
      scan_id: scanId,
      unet_mask_path: payload.unet_mask_path ?? null,
      gradcam_path: payload.gradcam_path ?? null,
      tumor_volume_cc: payload.tumor_volume_cc ?? null,
      tumor_location_description: payload.tumor_location_description ?? null,
      inference_log: payload.inference_log ?? null,
      confidence: payload.confidence ?? null,
      tumor_type: payload.tumor_type ?? null,
      risk_level: payload.risk_level ?? null,
      estimated_diameter: payload.estimated_diameter ?? null,
      brain_hemisphere: payload.brain_hemisphere ?? null,
      lobe: payload.lobe ?? null,
      segmentation_quality: payload.segmentation_quality ?? null,
      growth_pct: growth_pct !== null ? growth_pct : (payload.growth_pct ?? null),
      suggested_action: payload.suggested_action ?? null,
      processing_time_sec: payload.processing_time_sec ?? null,
    },
    update: {
      unet_mask_path: payload.unet_mask_path ?? undefined,
      gradcam_path: payload.gradcam_path ?? undefined,
      tumor_volume_cc: payload.tumor_volume_cc ?? undefined,
      tumor_location_description: payload.tumor_location_description ?? undefined,
      inference_log: payload.inference_log ?? undefined,
      confidence: payload.confidence ?? undefined,
      tumor_type: payload.tumor_type ?? undefined,
      risk_level: payload.risk_level ?? undefined,
      estimated_diameter: payload.estimated_diameter ?? undefined,
      brain_hemisphere: payload.brain_hemisphere ?? undefined,
      lobe: payload.lobe ?? undefined,
      segmentation_quality: payload.segmentation_quality ?? undefined,
      growth_pct: growth_pct !== null ? growth_pct : (payload.growth_pct !== undefined ? payload.growth_pct : undefined),
      suggested_action: payload.suggested_action ?? undefined,
      processing_time_sec: payload.processing_time_sec ?? undefined,
    },
  });
  return await serializeAnalysis(analysis);
}

async function doctorHasPatientRelationship(doctorId, patientId) {
  const [sharedScan, sharedReservation] = await Promise.all([
    prisma.scan.findFirst({
      where: { doctor_id: doctorId, patient_id: patientId },
      select: { id: true },
    }),
    prisma.reservation.findFirst({
      where: {
        doctor_id: doctorId,
        patient_id: patientId,
        status: { not: "CANCELLED" },
      },
      select: { id: true },
    }),
  ]);

  return Boolean(sharedScan || sharedReservation);
}

async function uploadScan({ file, patientId, doctorId }) {
  if (!file) throw badRequest("DICOM file is required.", "FILE_REQUIRED");

  if (!file.buffer || file.buffer.length === 0) {
    throw badRequest("Invalid file format. Only DICOM (.dcm) and JPEG (.jpg) files are allowed.", "INVALID_FILE_FORMAT");
  }

  const isDicom = file.buffer && file.buffer.length >= 132 &&
                  file.buffer[128] === 68 && file.buffer[129] === 73 &&
                  file.buffer[130] === 67 && file.buffer[131] === 77;
                  
  const isJpeg = file.buffer && file.buffer.length >= 2 &&
                 file.buffer[0] === 0xFF && file.buffer[1] === 0xD8;

  if (!isDicom && !isJpeg) {
    throw badRequest("Invalid file format. Only DICOM (.dcm) or JPEG (.jpg) files are allowed.", "INVALID_FILE_FORMAT");
  }

  const patient = await UserService.findUserById(patientId);
  if (!patient || patient.role !== "PATIENT") {
    throw notFound("Patient not found.", "PATIENT_NOT_FOUND");
  }

  const doctor = await UserService.findUserById(doctorId);
  if (!doctor || doctor.role !== "DOCTOR") {
    throw badRequest("Invalid or inactive doctor.", "INVALID_DOCTOR");
  }
  if (doctor.status !== "ACTIVE") {
    throw badRequest("Selected doctor is not available.", "DOCTOR_NOT_ACTIVE");
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

  clearCache(doctorId, scan.id);

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
  if (scan.status !== "UPLOADED" && scan.status !== "FAILED") {
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
  const aiDraft = buildDraftReport({
    volume: analysis?.tumor_volume_cc ?? null,
    location: analysis?.tumor_location_description ?? null,
    confidence: analysis?.confidence ?? null,
    processingTime: analysis?.processing_time_sec ?? null,
  });

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

  const dicomUrl = await getPresignedGetUrl(scan.dicom_path, 3600, { internal: true }).catch(() => null);
  const maskPutUrl = await getPresignedPutUrl(mask_path, "image/png", 3600, { internal: true }).catch(() => null);
  const gradcamPutUrl = await getPresignedPutUrl(gradcam_path, "image/png", 3600, { internal: true }).catch(() => null);

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
    const detail =
      err.response?.data?.detail ?? err.response?.data ?? err.message ?? "AI service unreachable";
    const errorMessage =
      typeof detail === "string" ? detail : JSON.stringify(detail);

    logger.error(
      { error: err.message, detail },
      `[ScanService] AI service failed for scan ${scanId}`
    );

    await failAnalysis(scanId, errorMessage);

    if (scan.doctor_id) {
      await NotificationService.createNotification(
        scan.doctor_id,
        "Analysis Failed",
        `AI analysis failed for scan ID ${scanId}. Please retry.`,
        `/doctor/scans/${scanId}`
      );
    }

    return;
  }

  const { segmentation, gradcam, report } = result;

  await upsertAnalysis(scanId, {
    unet_mask_path: segmentation.mask_path,
    gradcam_path: gradcam.gradcam_path,
    tumor_volume_cc: segmentation.tumor_volume_cc,
    tumor_location_description: segmentation.tumor_location_description,
    inference_log: segmentation.inference_log,
    confidence: segmentation.confidence,
    tumor_type: segmentation.tumor_type,
    risk_level: segmentation.risk_level,
    estimated_diameter: segmentation.estimated_diameter,
    brain_hemisphere: segmentation.brain_hemisphere,
    lobe: segmentation.lobe,
    segmentation_quality: segmentation.segmentation_quality,
    growth_pct: segmentation.growth_pct,
    suggested_action: segmentation.suggested_action,
    processing_time_sec: segmentation.processing_time_sec,
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

  await NotificationService.createNotification(
    scan.doctor_id,
    "Analysis Complete",
    `Scan analysis completed for scan ID ${scanId}.`,
    `/doctor/scans/${scanId}`
  );

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
    confidence: segmentation.confidence,
    tumor_type: segmentation.tumor_type,
    risk_level: segmentation.risk_level,
    estimated_diameter: segmentation.estimated_diameter,
    brain_hemisphere: segmentation.brain_hemisphere,
    lobe: segmentation.lobe,
    segmentation_quality: segmentation.segmentation_quality,
    growth_pct: segmentation.growth_pct,
    suggested_action: segmentation.suggested_action,
    processing_time_sec: segmentation.processing_time_sec,
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

  await NotificationService.createNotification(
    scan.doctor_id,
    "Analysis Complete",
    `Scan analysis completed for scan ID ${scanId}.`,
    `/doctor/scans/${scanId}`
  );

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

function indicatesNoTumor(volume, location) {
  if (volume !== null && volume !== undefined && Number(volume) === 0) {
    return true;
  }
  const loc = (location || "").toLowerCase();
  return ["no tumor", "no anomaly", "no focal", "not detected"].some((phrase) =>
    loc.includes(phrase)
  );
}

function buildDraftReport({ volume, location, confidence, processingTime }) {
  const volVal =
    volume !== null && volume !== undefined ? `${volume} cc` : "— cc";
  const locVal = location || "unspecified region";
  const confVal =
    confidence !== null && confidence !== undefined
      ? `${confidence}%`
      : HUMAN_REVIEW_CONFIDENCE;
  const timeVal =
    processingTime !== null && processingTime !== undefined
      ? `${processingTime} seconds`
      : "—";

  const findings = indicatesNoTumor(volume, location)
    ? [
        "No focal abnormality was segmented in the analyzed dataset.",
        "",
        `Estimated lesion volume: ${volVal}.`,
      ]
    : [
        `An abnormal region of interest is identified within the ${locVal}.`,
        "",
        `Estimated lesion volume: ${volVal}.`,
        "",
        "The AI segmentation highlights a focal area corresponding to the suspected lesion. No additional image-derived abnormalities were identified within the limits of the analyzed dataset.",
      ];

  const impression = indicatesNoTumor(volume, location)
    ? [
        "1. No segmented intracranial lesion identified on AI-assisted review.",
        "2. Correlation with the complete MRI examination, clinical history, and radiologist interpretation is recommended before establishing a final diagnosis.",
      ]
    : [
        `1. Focal intracranial lesion involving the ${locVal}.`,
        `2. Estimated lesion volume of approximately ${volVal}.`,
        "3. Correlation with the complete MRI examination, clinical history, and radiologist interpretation is recommended before establishing a final diagnosis.",
      ];

  return [
    "MRI BRAIN REPORT (DRAFT)",
    "",
    "Clinical Information",
    "Evaluation of an intracranial lesion.",
    "",
    "Technique",
    "Brain MRI reviewed using AI-assisted image analysis. This draft is generated from the available uploaded study and is intended to support radiologist review.",
    "",
    "Comparison",
    "No prior imaging available for comparison.",
    "",
    "Findings",
    ...findings,
    "",
    "Impression",
    ...impression,
    "",
    "AI Analysis Summary",
    `AI Confidence: ${confVal}`,
    `Processing Time: ${timeVal}`,
    "",
    "This report is an AI-generated draft intended for radiologist review only and must not be considered a final medical interpretation.",
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
  const serialized = await serializeAnalysis(analysis);
  return { scan_id: scan.id, ...serialized };
}

async function listByPatient(patientId, { doctorId } = {}) {
  if (doctorId) {
    const patient = await UserService.findUserById(patientId);
    if (!patient || patient.role !== "PATIENT") {
      throw notFound("Patient not found.", "PATIENT_NOT_FOUND");
    }

    const hasRelationship = await doctorHasPatientRelationship(doctorId, patientId);
    if (!hasRelationship) {
      throw forbidden("You do not have access to this patient's scans.");
    }
  }

  const where = { patient_id: patientId };
  if (doctorId) {
    where.doctor_id = doctorId;
  }

  const scans = await prisma.scan.findMany({
    where,
    orderBy: { uploaded_at: "desc" },
  });
  return Promise.all(scans.map(serializeScan));
}

async function listByDoctor(doctorId, { status, modality, search } = {}) {
  const cacheKey = `${doctorId}_${status}_${modality}_${search}`;
  if (listCache.has(cacheKey)) {
    return listCache.get(cacheKey);
  }

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

  const result = await Promise.all(scans.map(async (scan) => {
    const serialized = await serializeScan(scan);
    return {
      ...serialized,
      patient_name: scan.patient.full_name,
      report_id: scan.report?.id ?? null,
      report_status: scan.report?.status ?? null,
    };
  }));

  listCache.set(cacheKey, result);
  return result;
}

async function deleteScan(scanId, { requester }) {
  const scan = await getScanRecord(scanId);
  if (!scan) throw notFound("Scan not found.", "SCAN_NOT_FOUND");
  if (requester.role === "DOCTOR" && scan.doctor_id !== requester.sub) {
    throw forbidden("You do not have access to delete this scan.");
  }

  // Retrieve analysis paths if exist
  const analysis = await prisma.scanAnalysis.findUnique({
    where: { scan_id: scanId },
  });

  // Physically delete the files
  const fs = require("fs");
  const path = require("path");
  const { getStorageRoot, isS3Enabled } = require("../integrations/storageClient");
  
  const filesToDelete = [
    scan.dicom_path,
    analysis?.unet_mask_path,
    analysis?.gradcam_path
  ].filter(Boolean);

  if (isS3Enabled()) {
    const { s3Client } = require("../integrations/storageClient");
    for (const file of filesToDelete) {
      try {
        await s3Client.removeObject(process.env.S3_BUCKET, file);
      } catch (err) {
        logger.error({ err }, `[ScanService] failed to delete ${file} from S3`);
      }
    }
  } else {
    for (const file of filesToDelete) {
      const fullPath = path.join(getStorageRoot(), file.replace(/^storage\//, ""));
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          logger.error({ err }, `[ScanService] failed to delete local file ${fullPath}`);
        }
      }
    }
  }

  // Cascade delete from DB
  await prisma.scan.delete({ where: { id: scanId } });

  AuditService.log({
    user_id: requester.sub,
    action: "DELETE_SCAN",
    entity_type: "SCAN",
    entity_id: scanId,
  });

  clearCache(scan.doctor_id, scanId);
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
  deleteScan,
  getScanRecord,
  doctorHasPatientRelationship,
};
