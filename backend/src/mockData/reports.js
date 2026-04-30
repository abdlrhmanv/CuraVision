const { randomUUID } = require("crypto");

/**
 * Mock reports store — replaces the PostgreSQL `reports` and
 * `report_corrections` tables for the prototype.
 *
 * Two seeded, realistic brain-MRI reports are pre-published so the patient
 * UI has something to render without running the full analysis pipeline.
 */

const REPORTS = [
  {
    id: "report-001",
    scan_id: "scan-001",
    patient_id: "patient-001",
    doctor_id: "doctor-001",
    status: "PUBLISHED",
    patient_visible: true,
    ai_draft: `FINDINGS:
MRI of the brain was performed with and without gadolinium contrast enhancement.

A 12.3 cc mass is identified in the left frontal lobe at the junction of the
precentral and middle frontal gyri. The lesion demonstrates heterogeneous T2/FLAIR
signal hyperintensity with a central region of T1 hypointensity consistent with
necrosis. Irregular peripheral contrast enhancement is observed on post-gadolinium
T1-weighted sequences, indicating disruption of the blood-brain barrier.

There is surrounding T2/FLAIR signal abnormality consistent with vasogenic edema,
extending into the corona radiata. This produces mild mass effect with approximately
4 mm leftward midline shift. No herniation is identified at this time.

IMPRESSION:
Findings are most consistent with a high-grade glial neoplasm (Grade III–IV glioma,
WHO classification). The size, contrast enhancement pattern, central necrosis, and
surrounding edema are characteristic of a glioblastoma (GBM). Clinical correlation
with patient history and multidisciplinary tumor board discussion is strongly
recommended. Neurosurgical evaluation for possible resection or biopsy is advised.`,
    final_report: `FINDINGS:
MRI of the brain was performed with and without gadolinium contrast enhancement.

A 12.3 cc mass is identified in the left frontal lobe at the junction of the
precentral and middle frontal gyri. The lesion demonstrates heterogeneous T2/FLAIR
signal hyperintensity with a central region of T1 hypointensity consistent with
necrosis.

IMPRESSION:
Findings are most consistent with a high-grade glial neoplasm. Neurosurgical
evaluation for possible resection or biopsy is advised.

— Reviewed and approved by Dr. Ahmed Khalil, MD (Neuroradiology)`,
    created_at: "2026-04-15T09:30:00Z",
    updated_at: "2026-04-15T14:00:00Z",
  },
  {
    id: "report-002",
    scan_id: "scan-002",
    patient_id: "patient-002",
    doctor_id: "doctor-001",
    status: "PUBLISHED",
    patient_visible: true,
    ai_draft: `FINDINGS:
MRI of the brain without contrast.

A well-circumscribed, homogeneously T2 hyperintense lesion measuring approximately
2.1 cm in greatest diameter is identified in the right temporal lobe. There is no
surrounding edema and no mass effect on adjacent structures.

IMPRESSION:
Most consistent with a low-grade glial neoplasm or benign cystic lesion. Further
evaluation with gadolinium-enhanced MRI and neurosurgical consultation recommended.`,
    final_report: `FINDINGS:
A well-circumscribed, homogeneously T2 hyperintense lesion measuring approximately
2.1 cm in greatest diameter is identified in the right temporal lobe.

IMPRESSION:
Most consistent with a low-grade glial neoplasm or benign cystic lesion.
Gadolinium-enhanced follow-up MRI in 3 months is recommended.

— Reviewed and approved by Dr. Ahmed Khalil, MD (Neuroradiology)`,
    created_at: "2026-04-18T10:00:00Z",
    updated_at: "2026-04-18T11:30:00Z",
  },
];

/** @type {object[]} */
const CORRECTIONS = [];

function getReportById(reportId) {
  return REPORTS.find((r) => r.id === reportId) ?? null;
}

function getReportByScan(scanId) {
  return REPORTS.find((r) => r.scan_id === scanId) ?? null;
}

function getReportsByPatient(patientId, { onlyVisible = true } = {}) {
  return REPORTS.filter(
    (r) =>
      r.patient_id === patientId &&
      (!onlyVisible || r.patient_visible === true)
  );
}

function createReport({ scan_id, patient_id, doctor_id, ai_draft }) {
  const now = new Date().toISOString();
  const report = {
    id: randomUUID(),
    scan_id,
    patient_id,
    doctor_id,
    status: "DRAFT",
    patient_visible: false,
    ai_draft: ai_draft ?? "",
    final_report: null,
    created_at: now,
    updated_at: now,
  };
  REPORTS.push(report);
  return report;
}

function updateReport(reportId, patch) {
  const report = getReportById(reportId);
  if (!report) return null;
  const allowed = ["final_report", "status", "patient_visible"];
  for (const key of allowed) {
    if (patch[key] !== undefined) report[key] = patch[key];
  }
  report.updated_at = new Date().toISOString();
  return report;
}

function addCorrection({ report_id, field, old_value, new_value }) {
  const entry = {
    id: randomUUID(),
    report_id,
    field,
    old_value,
    new_value,
    created_at: new Date().toISOString(),
  };
  CORRECTIONS.push(entry);
  return entry;
}

function getCorrections(reportId) {
  return CORRECTIONS.filter((c) => c.report_id === reportId);
}

module.exports = {
  REPORTS,
  CORRECTIONS,
  getReportById,
  getReportByScan,
  getReportsByPatient,
  createReport,
  updateReport,
  addCorrection,
  getCorrections,
};
