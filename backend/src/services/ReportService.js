const {
  getReportById,
  getReportByScan,
  getReportsByPatient,
  updateReport,
  addCorrection,
  getCorrections,
} = require("../mockData/reports");
const { getScanById } = require("../mockData/scans");
const AuditService = require("./AuditService");

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function getReportForScan(scanId, { requester }) {
  const scan = getScanById(scanId);
  if (!scan) throw httpError(404, "SCAN_NOT_FOUND", "Scan not found.");
  if (requester.role === "DOCTOR" && scan.doctor_id !== requester.sub) {
    throw httpError(403, "FORBIDDEN", "You do not have access to this scan.");
  }

  const report = getReportByScan(scanId);
  if (!report) {
    throw httpError(404, "REPORT_NOT_READY", "Report is not available yet.");
  }
  return report;
}

/**
 * Doctor edits a report.
 *
 * Two flavours of HITL corrections are supported:
 *   1. Explicit — client sends structured `corrections: [{ field, old_value, new_value }]`
 *      for fine-grained training labels (e.g. per-section edits).
 *   2. Implicit — whenever `final_report` changes we auto-log a correction
 *      with the previous vs new text so the ML team always has a training
 *      pair, even if the UI forgets to send structured diffs.
 */
function editReport(reportId, { requester, final_report, corrections }) {
  const report = getReportById(reportId);
  if (!report) throw httpError(404, "REPORT_NOT_FOUND", "Report not found.");
  if (report.doctor_id !== requester.sub) {
    throw httpError(403, "FORBIDDEN", "Only the assigned doctor can edit this report.");
  }
  if (report.status === "PUBLISHED") {
    throw httpError(409, "REPORT_PUBLISHED", "Published reports cannot be edited.");
  }

  const patch = {};
  const previousFinal = report.final_report;
  const finalReportChanged =
    typeof final_report === "string" && final_report !== previousFinal;

  if (finalReportChanged) {
    patch.final_report = final_report;
    patch.status = "REVIEWED";
  }
  updateReport(reportId, patch);

  let autoCorrections = 0;

  // Implicit: record a correction when the text actually changed.
  if (finalReportChanged) {
    const baseline = previousFinal ?? report.ai_draft ?? "";
    if (baseline !== final_report) {
      addCorrection({
        report_id: reportId,
        field: "final_report",
        old_value: baseline,
        new_value: final_report,
      });
      autoCorrections += 1;
    }
  }

  // Explicit: whatever the UI tagged (e.g. "impression" vs "findings").
  let explicitCorrections = 0;
  if (Array.isArray(corrections)) {
    for (const c of corrections) {
      if (c && typeof c.field === "string") {
        addCorrection({
          report_id: reportId,
          field: c.field,
          old_value: c.old_value ?? null,
          new_value: c.new_value ?? null,
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

function approveReport(reportId, { requester }) {
  const report = getReportById(reportId);
  if (!report) throw httpError(404, "REPORT_NOT_FOUND", "Report not found.");
  if (report.doctor_id !== requester.sub) {
    throw httpError(403, "FORBIDDEN", "Only the assigned doctor can approve this report.");
  }
  if (!report.final_report || report.final_report.trim().length === 0) {
    throw httpError(400, "REPORT_EMPTY", "Finalize the report text before approval.");
  }

  updateReport(reportId, {
    status: "PUBLISHED",
    patient_visible: true,
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

function listForPatient(patientId) {
  return getReportsByPatient(patientId, { onlyVisible: true });
}

function getForPatient(reportId, patientId) {
  const report = getReportById(reportId);
  if (!report || !report.patient_visible || report.patient_id !== patientId) {
    throw httpError(404, "REPORT_NOT_FOUND", "Report not found.");
  }
  return report;
}

module.exports = {
  getReportForScan,
  editReport,
  approveReport,
  listForPatient,
  getForPatient,
  getCorrections,
};
