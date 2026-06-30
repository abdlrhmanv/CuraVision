const prisma = require("../config/prisma");
const AuditService = require("./AuditService");
const logger = require("../utils/logger");
const nodemailer = require("nodemailer");

const { notFound, forbidden, conflict, badRequest } = require("../utils/AppError");
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
  if (!scan) throw notFound("Scan not found.", "SCAN_NOT_FOUND");
  if (requester.role === "DOCTOR" && scan.doctor_id !== requester.sub) {
    throw forbidden("You do not have access to this scan.");
  }

  const report = await getReportByScan(scanId);
  if (!report) {
    throw notFound("Report is not available yet.", "REPORT_NOT_READY");
  }
  return report;
}

async function editReport(reportId, { requester, final_report, corrections }) {
  const report = await getReportById(reportId);
  if (!report) throw notFound("Report not found.", "REPORT_NOT_FOUND");
  if (report.doctor_id !== requester.sub) {
    throw forbidden("Only the assigned doctor can edit this report.");
  }
  if (report.status === "PUBLISHED") {
    throw conflict("Published reports cannot be edited.", "REPORT_PUBLISHED");
  }

  const previousFinal = report.final_report;
  const finalReportChanged =
    typeof final_report === "string" && final_report !== previousFinal;

  const result = await prisma.$transaction(async (tx) => {
    if (finalReportChanged) {
      await tx.report.update({
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
        await tx.reportCorrection.create({
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
          await tx.reportCorrection.create({
            data: {
              report_id: reportId,
              field: c.field,
              old_value: c.old_value ?? null,
              new_value: c.new_value ?? null,
            },
          });
          explicitCorrections += 1;

          if (c.field === "tumor_volume_cc") {
            await tx.scanAnalysis.update({
              where: { scan_id: report.scan_id },
              data: { tumor_volume_cc: parseFloat(c.new_value) || null },
            });
          } else if (c.field === "tumor_location_description") {
            await tx.scanAnalysis.update({
              where: { scan_id: report.scan_id },
              data: { tumor_location_description: c.new_value ?? null },
            });
          }
        }
      }
    }

    return { autoCorrections, explicitCorrections };
  });

  AuditService.log({
    user_id: requester.sub,
    action: "EDIT_REPORT",
    entity_type: "REPORT",
    entity_id: reportId,
    metadata: {
      auto_corrections: result.autoCorrections,
      explicit_corrections: result.explicitCorrections,
    },
  });

  return getReportById(reportId);
}

async function approveReport(reportId, { requester }) {
  const report = await getReportById(reportId);
  if (!report) throw notFound("Report not found.", "REPORT_NOT_FOUND");
  if (report.doctor_id !== requester.sub) {
    throw forbidden("Only the assigned doctor can approve this report.");
  }
  if (!report.final_report || report.final_report.trim().length === 0) {
    throw badRequest("Finalize the report text before approval.", "REPORT_EMPTY");
  }

  const published = await prisma.report.update({
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

  // Asynchronously send mock email notification
  sendNotificationEmail(report.patient_id, report.id).catch(err => 
    logger.error({ err }, "Failed to send report notification email")
  );

  return serializeReport(published);
}

/**
 * Mock email notification system using Nodemailer Ethereal Transport.
 */
async function sendNotificationEmail(patientId, reportId) {
  const user = await prisma.user.findUnique({ where: { id: patientId } });
  if (!user || !user.email) return;

  // Use Ethereal for testing
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, 
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const info = await transporter.sendMail({
    from: '"CuraVision Notifications" <noreply@curavision.app>',
    to: user.email,
    subject: "Your Scan Report is Ready",
    text: `Hello ${user.full_name},\n\nYour recent MRI scan report (ID: ${reportId}) has been finalized and approved by your doctor.\nYou can view it in your patient portal now.\n\nBest,\nThe CuraVision Team`,
    html: `<p>Hello <b>${user.full_name}</b>,</p><p>Your recent MRI scan report has been finalized and approved by your doctor.</p><p>You can view it in your patient portal now.</p><br><p>Best,<br>The CuraVision Team</p>`,
  });

  logger.info("Email notification sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
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
    throw notFound("Report not found.", "REPORT_NOT_FOUND");
  }
  return report;
}

async function getCorrections(reportId, { requester }) {
  const report = await getReportById(reportId);
  if (!report) throw notFound("Report not found.", "REPORT_NOT_FOUND");
  if (requester.role === "DOCTOR" && report.doctor_id !== requester.sub) {
    throw forbidden("You do not have access to this report's corrections.");
  }
  if (requester.role === "PATIENT" && report.patient_id !== requester.sub) {
    throw forbidden("You do not have access to this report's corrections.");
  }
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
