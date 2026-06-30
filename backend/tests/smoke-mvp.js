#!/usr/bin/env node
/**
 * End-to-end smoke test for the P0 MVP flows.
 *
 *   node tests/smoke-mvp.js            # defaults to http://localhost:3001
 *   BASE_URL=http://localhost:3099 node tests/smoke-mvp.js
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

async function req(method, pathname, { token, body, form } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers,
    body: payload,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${pathname} → ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log("▶ Health");
  console.log("  ", await req("GET", "/health"));

  console.log("▶ Doctor login");
  const doc = await req("POST", "/api/auth/login", {
    body: { email: "doctor@curavision.com", password: "Doctor@123" },
  });
  console.log("  doctor id:", doc.user.id);

  console.log("▶ Patient login");
  const pat = await req("POST", "/api/auth/login", {
    body: { email: "patient1@curavision.com", password: "Patient@123" },
  });
  console.log("  patient id:", pat.user.id);

  console.log("▶ Doctor uploads a synthetic DICOM");
  const tmpFile = path.join(os.tmpdir(), `smoke-${Date.now()}.dcm`);
  const buffer = Buffer.alloc(132);
  buffer.write("DICM", 128, "ascii");
  fs.writeFileSync(tmpFile, buffer);
  const form = new FormData();
  form.append("patient_id", pat.user.id);
  form.append(
    "file",
    new Blob([fs.readFileSync(tmpFile)], { type: "application/dicom" }),
    path.basename(tmpFile)
  );
  const upload = await req("POST", "/api/scans", { token: doc.token, form });
  fs.unlinkSync(tmpFile);
  const scanId = upload.scan_id;
  console.log("  scan id:", scanId);

  console.log("▶ Polling scan status");
  let status = upload.status;
  for (let i = 1; i <= 15; i += 1) {
    const scan = await req("GET", `/api/scans/${scanId}`, { token: doc.token });
    status = scan.status;
    console.log(`  attempt ${i}: ${status}`);
    if (status === "ANALYSIS_COMPLETE" || status === "FAILED") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (status !== "ANALYSIS_COMPLETE") {
    throw new Error("Scan never completed");
  }

  console.log("▶ Analysis payload");
  const analysis = await req("GET", `/api/scans/${scanId}/analysis`, {
    token: doc.token,
  });
  console.log("  volume:", analysis.tumor_volume_cc, "cc @", analysis.tumor_location_description);

  console.log("▶ Draft report");
  const report = await req("GET", `/api/scans/${scanId}/report`, { token: doc.token });
  console.log("  report id:", report.id);

  console.log("▶ Doctor edits + approves");
  await req("PATCH", `/api/reports/${report.id}`, {
    token: doc.token,
    body: { final_report: "Smoke test — approved." },
  });
  const approved = await req("POST", `/api/reports/${report.id}/approve`, {
    token: doc.token,
  });
  console.log("  status:", approved.status);

  console.log("▶ Patient lists reports");
  const patientReports = await req("GET", "/api/patient/reports", { token: pat.token });
  console.log("  ids:", patientReports.reports.map((r) => r.id));

  console.log("▶ Patient chats about the report");
  try {
    const chat = await req("POST", `/api/chat/${report.id}/message`, {
      token: pat.token,
      body: { message: "What does this report mean for me?" },
    });
    console.log("  reply:", chat.reply.slice(0, 120));
    console.log("  sources:", chat.sources);
  } catch (err) {
    if (String(err.message).includes("AI_SERVICE_ERROR")) {
      console.log("  skipped (FastAPI AI service offline — route wiring verified)");
    } else {
      throw err;
    }
  }

  console.log("▶ Doctor scan list");
  const doctorScans = await req("GET", "/api/scans", { token: doc.token });
  console.log("  total:", doctorScans.scans.length);

  console.log("▶ HITL corrections history (auto-captured)");
  const corrections = await req(
    "GET",
    `/api/reports/${report.id}/corrections`,
    { token: doc.token }
  );
  console.log("  corrections:", corrections.corrections.length);
  if (corrections.corrections.length === 0) {
    throw new Error("Expected auto-captured correction after report edit");
  }

  console.log("▶ Patient books an appointment");
  const availability = await req(
    "GET",
    `/api/doctors/${doc.user.id}/availability`,
    { token: pat.token }
  );
  if (!availability.slots.length) {
    console.log("  no open slots in the next 7 days — skipping booking");
  } else {
    const slot = availability.slots[0];
    const booking = await req("POST", "/api/reservations", {
      token: pat.token,
      body: {
        doctor_id: doc.user.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
      },
    });
    console.log("  reservation id:", booking.id, "status:", booking.status);

    const confirmed = await req("PATCH", `/api/reservations/${booking.id}`, {
      token: doc.token,
      body: { status: "CONFIRMED" },
    });
    console.log("  confirmed:", confirmed.status);
  }

  console.log("✓ All smoke checks passed");
}

main().catch((err) => {
  console.error("✗ Smoke test failed:", err);
  process.exit(1);
});
