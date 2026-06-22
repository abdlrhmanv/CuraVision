const prisma = require("../config/prisma");
const AuditService = require("./AuditService");

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function serializeReport(report) {
  return {
    id: report.id,
    scan_id: report.scan_id,
    patient_id: report.patient_id,
    doctor_id: report.doctor_id,
    status: report.status,
    patient_visible: report.patient_visible,
    ai_draft: report.ai_draft,
    final_report: report.final_report,
    created_at: report.created_at.toISOString(),
    updated_at: report.updated_at.toISOString(),
  };
}

function serializeCorrection(correction) {
  return {
    id: correction.id,
    report_id: correction.report_id,
    field: correction.field,
    old_value: correction.old_value,
    new_value: correction.new_value,
    created_at: correction.created_at.toISOString(),
  };
}

async function getReportById(reportId) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  return report ? serializeReport(report) : null;
}

async function getReportByScan(scanId) {
  const report = await prisma.report.findUnique({ where: { scan_id: scanId } });
  return report ? serializeReport(report) : null;
}

async function upsertDraftReport({ scan_id, patient_id, doctor_id, ai_draft }) {
  const report = await prisma.report.upsert({
    where: { scan_id },
    create: {
      scan_id,
      patient_id,
      doctor_id,
      status: "DRAFT",
      patient_visible: false,
      ai_draft: ai_draft ?? "",
    },
    update: {
      ai_draft: ai_draft ?? undefined,
    },
  });
  return serializeReport(report);
}

async function getReportForScan(scanId, { requester }) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) throw httpError(404, "SCAN_NOT_FOUND", "Scan not found.");
  if (requester.role === "DOCTOR" && scan.doctor_id !== requester.sub) {
    throw httpError(403, "FORBIDDEN", "You do not have access to this scan.");
  }

  const report = await getReportByScan(scanId);
  if (!report) {
    throw httpError(404, "REPORT_NOT_READY", "Report is not available yet.");
  }
  return report;
}

async function editReport(reportId, { requester, final_report, corrections }) {
  const report = await getReportById(reportId);
  if (!report) throw httpError(404, "REPORT_NOT_FOUND", "Report not found.");
  if (report.doctor_id !== requester.sub) {
    throw httpError(403, "FORBIDDEN", "Only the assigned doctor can edit this report.");
  }
  if (report.status === "PUBLISHED") {
    throw httpError(409, "REPORT_PUBLISHED", "Published reports cannot be edited.");
  }

  const previousFinal = report.final_report;
  const finalReportChanged =
    typeof final_report === "string" && final_report !== previousFinal;

  if (finalReportChanged) {
    await prisma.report.update({
      where: { id: reportId },
      data: {
        final_report,
        status: "REVIEWED",
      },
    });
  }

  let autoCorrections = 0;

  if (finalReportChanged) {
    const baseline = previousFinal ?? report.ai_draft ?? "";
    if (baseline !== final_report) {
      await prisma.reportCorrection.create({
        data: {
          report_id: reportId,
          field: "final_report",
          old_value: baseline,
          new_value: final_report,
        },
      });
      autoCorrections += 1;
    }
  }

  let explicitCorrections = 0;
  if (Array.isArray(corrections)) {
    for (const c of corrections) {
      if (c && typeof c.field === "string") {
        await prisma.reportCorrection.create({
          data: {
            report_id: reportId,
            field: c.field,
            old_value: c.old_value ?? null,
            new_value: c.new_value ?? null,
          },
        });
        explicitCorrections += 1;
      }
    }
  }

  AuditService.log({
    user_id: requester.sub,
    action: "EDIT_REPORT",
    entity_type: "REPORT",
    entity_id: reportId,
    metadata: {
      auto_corrections: autoCorrections,
      explicit_corrections: explicitCorrections,
    },
  });

  return getReportById(reportId);
}

async function approveReport(reportId, { requester }) {
  const report = await getReportById(reportId);
  if (!report) throw httpError(404, "REPORT_NOT_FOUND", "Report not found.");
  if (report.doctor_id !== requester.sub) {
    throw httpError(403, "FORBIDDEN", "Only the assigned doctor can approve this report.");
  }
  if (!report.final_report || report.final_report.trim().length === 0) {
    throw httpError(400, "REPORT_EMPTY", "Finalize the report text before approval.");
  }

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "PUBLISHED",
      patient_visible: true,
    },
  });

  AuditService.log({
    user_id: requester.sub,
    action: "APPROVE_REPORT",
    entity_type: "REPORT",
    entity_id: reportId,
    metadata: { patient_id: report.patient_id },
  });

  return getReportById(reportId);
}

async function listForPatient(patientId) {
  const reports = await prisma.report.findMany({
    where: {
      patient_id: patientId,
      patient_visible: true,
    },
    orderBy: { updated_at: "desc" },
  });
  return reports.map(serializeReport);
}

async function getForPatient(reportId, patientId) {
  const report = await getReportById(reportId);
  if (!report || !report.patient_visible || report.patient_id !== patientId) {
    throw httpError(404, "REPORT_NOT_FOUND", "Report not found.");
  }
  return report;
}

async function getCorrections(reportId) {
  const corrections = await prisma.reportCorrection.findMany({
    where: { report_id: reportId },
    orderBy: { created_at: "asc" },
  });
  return corrections.map(serializeCorrection);
}

module.exports = {
  getReportById,
  getReportByScan,
  upsertDraftReport,
  getReportForScan,
  editReport,
  approveReport,
  listForPatient,
  getForPatient,
  getCorrections,
};
