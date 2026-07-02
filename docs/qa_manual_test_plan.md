# CuraVision QA Manual Test Plan

This document contains the comprehensive manual test plan for CuraVision. It covers every major module and feature, detailing specific test cases designed to verify the security, stability, accessibility, and correctness of the system.

## Test Cases Summary Table

| Module | Number of Test Cases |
| :--- | :--- |
| Authentication | 25 |
| Authorization & RBAC | 15 |
| Doctor Portal | 13 |
| Patient Portal | 13 |
| Admin Portal | 13 |
| DICOM Upload | 13 |
| DICOM Viewer | 13 |
| AI Analysis | 13 |
| Report Editing | 13 |
| Report Approval | 13 |
| Chatbot | 13 |
| Appointments | 13 |
| Notifications | 13 |
| Storage | 10 |
| Security | 18 |
| Error Handling | 17 |
| Performance | 10 |
| Responsive Design | 10 |
| Accessibility | 15 |
| **Total** | **263** |

## Test Plan Details

### Module: Authentication

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-AUTH-001 | User Login with Valid Credentials | User is registered and status is ACTIVE | 1. Navigate to login page.<br>2. Enter valid email and password.<br>3. Click Login. | User is authenticated and redirected to their respective dashboard. | P0 | Critical | doctor@curavision.com / Doctor@123 | [ ] |
| TC-AUTH-002 | User Login with Invalid Password | User is registered | 1. Navigate to login page.<br>2. Enter valid email and incorrect password.<br>3. Click Login. | Validation error displayed: 'Email or password is incorrect.' | P0 | High | doctor@curavision.com / Wrong@123 | [ ] |
| TC-AUTH-003 | User Login with Empty Fields | Login page is opened | 1. Leave email and password blank.<br>2. Click Login. | Frontend validation highlights fields; form submission blocked. | P1 | Medium | None | [ ] |
| TC-AUTH-004 | User Login with Malformed Email | Login page is opened | 1. Enter email without '@' or domain.<br>2. Click Login. | Validation error: 'Please enter a valid email address.' | P1 | Medium | invalidemail | [ ] |
| TC-AUTH-005 | New User Registration (Patient) | Registration page is opened | 1. Enter valid details (email, full name, password).<br>2. Click Register. | Account created in DISABLED state; verification email triggered via Ethereal. | P0 | High | new_patient@example.com / Patient@123 | [ ] |
| TC-AUTH-006 | Email Verification Success Flow | User just registered; verification email sent | 1. Click verification link in email.<br>2. Verify redirection. | User status updated to ACTIVE in DB; redirected to login with success message. | P0 | High | Verification token | [ ] |
| TC-AUTH-007 | Email Verification Link Expiry | Verification link sent to user | 1. Attempt to use expired verification token (>24h).<br>2. Click link. | Error message: 'Verification link expired or invalid.' | P1 | High | Expired token | [ ] |
| TC-AUTH-008 | Login Attempt with Disabled Account | User is registered but email is not verified (status DISABLED) | 1. Enter credentials.<br>2. Click Login. | Login rejected with 403 Forbidden: 'This account is not active.' | P0 | High | disabled_user@example.com | [ ] |
| TC-AUTH-009 | Forgot Password - Trigger Link | Login page is opened | 1. Click 'Forgot Password'.<br>2. Enter registered email.<br>3. Click Send Reset Link. | Success message displayed; reset token email sent. | P1 | High | doctor@curavision.com | [ ] |
| TC-AUTH-010 | Forgot Password - Nonexistent Email | Login page is opened | 1. Click 'Forgot Password'.<br>2. Enter unregistered email.<br>3. Click Send Reset Link. | System returns success message (to prevent user enumeration) but sends no email. | P2 | Low | fakeemail@example.com | [ ] |
| TC-AUTH-011 | Reset Password - Use Link | Reset token email received | 1. Click reset link.<br>2. Enter new password.<br>3. Click Reset Password. | Password successfully updated in DB; user redirected to login. | P0 | High | NewPassword@123 | [ ] |
| TC-AUTH-012 | Reset Password - Invalid Token | Password reset page is opened | 1. Modify the reset token in URL.<br>2. Enter new password and click Reset. | Reset rejected with 401: 'Password reset token is invalid or has expired.' | P1 | High | Invalid token | [ ] |
| TC-AUTH-013 | Session Persistence on Refresh | User is logged in | 1. Navigate to dashboard.<br>2. Refresh the page. | Session remains active using JWT; dashboard remains visible. | P1 | Medium | None | [ ] |
| TC-AUTH-014 | Session Expiry (JWT 15m) | User is logged in | 1. Idle for 15 minutes.<br>2. Perform a dashboard action. | Redirected to login page; token refreshed or rejected. | P1 | High | None | [ ] |
| TC-AUTH-015 | User Logout - Direct Action | User is logged in | 1. Click 'Logout' button in sidebar. | Session tokens cleared from client; redirected to login; back button does not restore session. | P0 | High | None | [ ] |
| TC-AUTH-016 | Password Length Validation | Registration page is opened | 1. Register with a password of 7 characters.<br>2. Click Register. | Validation error: 'Password must be at least 8 characters long.' | P1 | Medium | short12 | [ ] |
| TC-AUTH-017 | Password Masking Toggle | Login/Registration page opened | 1. Click visibility eye icon next to password input. | Password characters toggle between masked (dots) and plaintext. | P2 | Low | None | [ ] |
| TC-AUTH-018 | Duplicate Email Registration | User email already exists in system | 1. Attempt to register with the same email.<br>2. Click Register. | Error message: 'Email already in use.' (409) | P0 | High | patient1@curavision.com | [ ] |
| TC-AUTH-019 | Bearer Token Format Verification | API requests are sent | 1. Inspect outgoing requests for Authorization header format. | Header includes: 'Bearer <JWT_TOKEN>'. | P1 | High | None | [ ] |
| TC-AUTH-020 | Refresh Token Handshake | User session is active | 1. Let short-lived JWT expire.<br>2. Attempt a fetch operation. | Refresh token exchanged silently for new JWT; no user interruption. | P1 | Medium | None | [ ] |
| TC-AUTH-021 | Password Strength Indicator Visibility | Registration page opened | 1. Enter password with different complexities. | Displays strength level (e.g. Weak, Medium, Strong) dynamically. | P2 | Low | Pass123! | [ ] |
| TC-AUTH-022 | Account Lockout Policy Trigger | Active account exists | 1. Submit incorrect login 5 times in a row. | Account status set to LOCKED; login blocked for 15 minutes. | P0 | High | doctor@curavision.com | [ ] |
| TC-AUTH-023 | JWT Expiration Time Verification | Token generated | 1. Inspect token payload details. | exp timestamp is set to exactly 15 minutes in the future. | P1 | Medium | None | [ ] |
| TC-AUTH-024 | Autofill Compatibility | Login form opened | 1. Focus email input. | Browser autofill suggestions pop up correctly. | P2 | Low | None | [ ] |
| TC-AUTH-025 | Multiple Session Terminate | User logged in on browser A | 1. Log in on browser B.<br>2. Click Logout on browser B. | Browser B is logged out; browser A session remains unaffected. | P2 | Low | None | [ ] |

### Module: Authorization & RBAC

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-RBAC-001 | Doctor Route Protection | Patient is logged in | 1. Attempt to navigate directly to /doctor/dashboard. | Access denied; redirected to patient dashboard or 403 page. | P0 | Critical | patient-token | [ ] |
| TC-RBAC-002 | Patient Route Protection | Doctor is logged in | 1. Attempt to navigate directly to /patient/dashboard. | Access denied; redirected to doctor dashboard or 403 page. | P0 | Critical | doctor-token | [ ] |
| TC-RBAC-003 | Admin Route Protection | Doctor is logged in | 1. Attempt to access /admin/audit-logs. | Access denied; error 403 Forbidden returned from API. | P0 | Critical | doctor-token | [ ] |
| TC-RBAC-004 | Unauthenticated Route Access | User is logged out | 1. Attempt to access /doctor/dashboard or /patient/dashboard. | Access denied; redirected to login page. | P0 | Critical | None | [ ] |
| TC-RBAC-005 | API Authentication Required | User is logged out | 1. Send GET request to /api/scans without headers. | Error 401 Unauthorized: 'Token is required'. | P0 | Critical | None | [ ] |
| TC-RBAC-006 | Patient Scan Isolation | Patient A is logged in | 1. Request details for Scan B (Patient B) via API. | Error 403 Forbidden; patients can only view their own scans. | P0 | Critical | Patient B Scan ID | [ ] |
| TC-RBAC-007 | Doctor Scan Access Verification | Doctor is logged in | 1. Request details for Scan A (assigned to this doctor). | Details returned successfully. | P0 | Critical | Scan A ID | [ ] |
| TC-RBAC-008 | Doctor Cross-Patient Isolation | Doctor A is logged in | 1. Attempt to request scan details assigned to Doctor B. | Error 403 Forbidden; doctors can only access assigned scans. | P0 | Critical | Doctor B Scan ID | [ ] |
| TC-RBAC-009 | Report Edit Role Restriction | Patient is logged in | 1. Send PATCH to /api/reports/1 with updated findings. | Error 403 Forbidden; patients cannot modify reports. | P0 | Critical | Report ID 1 | [ ] |
| TC-RBAC-010 | Report Approval Restriction | Patient is logged in | 1. Send POST to /api/reports/1/approve. | Error 403 Forbidden; only doctors can approve reports. | P0 | Critical | Report ID 1 | [ ] |
| TC-RBAC-011 | Admin Privilege Verification | Admin is logged in | 1. Send GET to /api/admin/audit-logs. | Full audit log dashboard loads successfully. | P0 | Critical | admin-token | [ ] |
| TC-RBAC-012 | Role Escalation Attempt | Patient is logged in | 1. Attempt to send PATCH to /api/users/self with role: 'DOCTOR'. | Role update ignored or rejected; role remains PATIENT. | P0 | Critical | patient-token | [ ] |
| TC-RBAC-013 | Audit Log Isolation | Doctor is logged in | 1. Send GET to /api/admin/audit-logs. | Access denied; 403 Forbidden returned. | P0 | Critical | doctor-token | [ ] |
| TC-RBAC-014 | Token Forgery Verification | Manipulated JWT token header | 1. Send request with signed token containing fake claims. | Rejected with 401/403 due to cryptographic signature failure. | P0 | Critical | Forged JWT | [ ] |
| TC-RBAC-015 | Route Access Matrix Validation | Role assigned as GUEST (if exists) | 1. Attempt to access any internal API endpoints. | All requests rejected; role has no explicit grants. | P0 | Critical | Guest token | [ ] |

### Module: Doctor Portal

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-DOCT-001 | Doctor Dashboard Layout | Doctor is logged in | 1. Load doctor dashboard. | Dashboard displays statistics, scan queue, and scheduler. | P1 | Medium | None | [x] |
| TC-DOCT-002 | Scan Queue Loading | Doctor is logged in | 1. View scan list. | List of scans is displayed with status, patient name, and uploaded date. | P1 | High | None | [x] |
| TC-DOCT-003 | Scan Queue Filtering by Status | Doctor is logged in | 1. Select status 'UPLOADED' from filters. | Only scans with status UPLOADED are displayed. | P1 | Medium | None | [x] |
| TC-DOCT-004 | Scan Queue Filtering by Modality | Doctor is logged in | 1. Select modality 'MRI' from filters. | Only MRI scans are displayed. | P1 | Medium | None | [x] |
| TC-DOCT-005 | Scan Queue Search by Patient Name | Doctor is logged in | 1. Enter patient name in search box. | Scan list is filtered to display matching patient names. | P1 | Medium | Patient name query | [x] |
| TC-DOCT-006 | Empty Scan Queue Display | Doctor logged in, no scans in DB | 1. Load scans page. | Displays placeholder message: 'No scans found'. | P2 | Low | None | [x] |
| TC-DOCT-007 | Select Scan to View Details | Doctor is logged in | 1. Click on a scan item from the queue. | Details panel loads with patient info, status, and viewer option. | P1 | High | Scan ID | [x] |
| TC-DOCT-008 | Create Report Button Visibility | Doctor is logged in, scan is UPLOADED | 1. View scan details. | Button to 'Create Report' or 'Trigger Analysis' is visible. | P1 | Medium | Scan ID | [x] |
| TC-DOCT-009 | Create Report Button Disabled | Doctor is logged in, scan status is FAILED | 1. View scan details. | Button to 'Create Report' is disabled. | P1 | Medium | Scan ID | [x] |
| TC-DOCT-010 | Access Denied on Other Doctor's Portal | Doctor A logged in | 1. Attempt to access Doctor B's availability settings via API. | Access denied; 403 Forbidden. | P0 | High | Doctor B ID | [x] |
| TC-DOCT-011 | Scheduler Grid Display | Doctor is logged in | 1. Open availability calendar tab. | Displays weekly calendar grid correctly. | P1 | Medium | None | [x] |
| TC-DOCT-012 | Save Availability Rule Success | Doctor is logged in | 1. Add a slot (e.g. Mon 9-17).<br>2. Click Save. | Slot persists in DB and updates grid layout. | P1 | High | Monday 09:00 - 17:00 | [x] |
| TC-DOCT-013 | Delete Availability Rule | Doctor is logged in, slot exists | 1. Click delete on existing slot.<br>2. Confirm deletion. | Slot is removed from DB and grid is updated. | P1 | Medium | Slot ID | [x] |

### Module: Patient Portal

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-PATI-001 | Patient Dashboard Layout | Patient is logged in | 1. Load dashboard. | Dashboard displays welcome message, recent reports, and quick actions. | P1 | Medium | None | [ ] |
| TC-PATI-002 | Reports List Loading | Patient is logged in | 1. View reports list. | List of approved reports is displayed with date and doctor name. | P1 | High | None | [ ] |
| TC-PATI-003 | Reports Filter by Doctor | Patient is logged in | 1. Select doctor name from filters. | Only reports generated by selected doctor are displayed. | P2 | Medium | Doctor Name | [ ] |
| TC-PATI-004 | Access Draft Report Restriction | Patient is logged in, report is in DRAFT | 1. Attempt to view report via link or API. | Error 403 Forbidden; draft reports must not be visible to patients. | P0 | Critical | Draft Report ID | [ ] |
| TC-PATI-005 | View Approved Report Details | Patient is logged in, report is PUBLISHED | 1. Click on report from list. | Report contents (final report text, metadata) displayed. | P1 | High | Published Report ID | [ ] |
| TC-PATI-006 | Empty Reports List Display | Patient logged in, no reports exist | 1. Open reports tab. | Displays message: 'No reports available yet'. | P2 | Low | None | [ ] |
| TC-PATI-007 | Chat Widget Integration on Report View | Patient is viewing a report | 1. Check page bottom-right. | Chat interface with bot is visible. | P1 | High | Report ID | [ ] |
| TC-PATI-008 | Patient Profile Overview | Patient is logged in | 1. Click Profile in sidebar. | Profile details (Name, DOB, Medical History) load correctly. | P1 | Medium | None | [ ] |
| TC-PATI-009 | Update Profile Details | Patient is logged in | 1. Edit phone number in profile.<br>2. Click Save. | Profile updated in database; success toast shown. | P1 | Medium | Phone number | [ ] |
| TC-PATI-010 | Patient Appointment Grid | Patient is logged in | 1. Navigate to appointments tab. | Lists upcoming and past appointments. | P1 | Medium | None | [ ] |
| TC-PATI-011 | Book Appointment - Slot Selection | Patient logged in, doctor has slots | 1. Click Book Appointment.<br>2. Select doctor and slot.<br>3. Click Confirm. | Appointment created with status PENDING. | P1 | High | Doctor ID, Slot | [ ] |
| TC-PATI-012 | Cancel Appointment - Success Flow | Patient has a pending appointment | 1. Click Cancel next to appointment. | Status changed to CANCELLED; slot released. | P1 | Medium | Appointment ID | [ ] |
| TC-PATI-013 | Download Approved Report PDF | Patient is viewing an approved report | 1. Click 'Download PDF' button. | PDF file containing report findings downloaded. | P1 | High | Report ID | [ ] |

### Module: Admin Portal

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-ADMI-001 | Admin Dashboard Layout | Admin is logged in | 1. Load admin page. | Admin navigation panel (Users, Audit Logs) renders correctly. | P1 | Medium | None | [ ] |
| TC-ADMI-002 | Users List Display | Admin is logged in | 1. Navigate to Users tab. | All registered users displayed in a paginated list. | P1 | High | None | [ ] |
| TC-ADMI-003 | Filter Users by Role | Admin is logged in | 1. Select role 'DOCTOR' from filter. | Only users with role DOCTOR are listed. | P2 | Medium | None | [ ] |
| TC-ADMI-004 | Filter Users by Status | Admin is logged in | 1. Select status 'DISABLED' from filter. | Only disabled users are listed. | P2 | Medium | None | [ ] |
| TC-ADMI-005 | Admin Deactivates User | Admin is logged in, user is ACTIVE | 1. Click 'Deactivate' next to user email. | User status set to DISABLED in DB; user loses active session. | P0 | High | User ID | [ ] |
| TC-ADMI-006 | Admin Activates User | Admin is logged in, user is DISABLED | 1. Click 'Activate' next to user email. | User status set to ACTIVE in DB; user can now log in. | P0 | High | User ID | [ ] |
| TC-ADMI-007 | Audit Logs Pagination | Admin is logged in | 1. View audit logs page. | Logs load in pages of 50 by default. | P2 | Medium | None | [ ] |
| TC-ADMI-008 | Filter Audit Logs by Action | Admin is logged in | 1. Filter logs by action 'LOGIN_SUCCESS'. | Only login success events are shown. | P1 | High | None | [ ] |
| TC-ADMI-009 | Filter Audit Logs by Date Range | Admin is logged in | 1. Set from/to dates in filters.<br>2. Click Apply. | Logs are filtered to date range. | P1 | High | Date Range | [ ] |
| TC-ADMI-010 | Audit Log Fields Verification | Admin is logged in | 1. Inspect an audit log entry. | Shows timestamp, user ID, action, entity type, and metadata. | P1 | High | None | [ ] |
| TC-ADMI-011 | Admin User Creation Flow | Admin is logged in | 1. Click Add User.<br>2. Enter details (set role DOCTOR).<br>3. Click Save. | Doctor account created and enabled. | P1 | High | New user info | [ ] |
| TC-ADMI-012 | Search Users by Full Name | Admin is logged in | 1. Search for user by name in search box. | User list displays matching names. | P2 | Medium | Name query | [ ] |
| TC-ADMI-013 | System Config Overview | Admin is logged in | 1. View system configuration tab. | Shows database, AI service, S3 connection statuses. | P1 | Medium | None | [ ] |

### Module: DICOM Upload

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-UPLD-001 | Upload Valid DICOM File | Doctor is logged in, patient selected | 1. Drag and drop valid .dcm file into upload area.<br>2. Click Upload. | Upload succeeds; file uploaded to Minio; scan status set to UPLOADED. | P0 | Critical | valid_scan.dcm | [ ] |
| TC-UPLD-002 | Upload Invalid File Type | Doctor is logged in, patient selected | 1. Drag and drop a .txt file.<br>2. Click Upload. | Validation error: 'Invalid file format. Only DICOM (.dcm) files are allowed.' (400) | P0 | High | test.txt | [ ] |
| TC-UPLD-003 | Upload DICOM with Missing File | Doctor is logged in, patient selected | 1. Submit upload form without selecting any file. | Validation error: 'file is required' (400). | P1 | High | None | [ ] |
| TC-UPLD-004 | Upload DICOM without Patient ID | Doctor is logged in, file selected | 1. Send upload API request without patient_id. | Rejected with 400 Bad Request. | P0 | High | valid_scan.dcm | [ ] |
| TC-UPLD-005 | Upload Excessively Large DICOM File | Doctor is logged in, patient selected | 1. Select a file larger than 100MB.<br>2. Click Upload. | Rejected with 'File size exceeds maximum limit (100MB)'. | P1 | High | large_scan.dcm | [ ] |
| TC-UPLD-006 | Upload Empty DICOM File | Doctor is logged in, patient selected | 1. Select a 0-byte .dcm file.<br>2. Click Upload. | Rejected with validation error. | P1 | Medium | empty.dcm | [ ] |
| TC-UPLD-007 | Drag and Drop Interface Interaction | Doctor is logged in, scan upload modal open | 1. Drag file over target dropzone. | Dropzone UI background changes color/highlights. | P2 | Low | valid_scan.dcm | [ ] |
| TC-UPLD-008 | Multiple Files Selection Block | Doctor is logged in | 1. Attempt to select multiple files in file chooser. | Only single file selection is allowed. | P2 | Low | None | [ ] |
| TC-UPLD-009 | Upload Progress Bar Verification | Doctor uploading large valid DICOM | 1. Click Upload.<br>2. Watch the modal interface. | Progress bar animates and displays percentage accurately. | P1 | Medium | valid_scan.dcm | [ ] |
| TC-UPLD-010 | Cancel Upload Mid-Process | Doctor uploading valid DICOM | 1. Click 'Cancel' while upload is at 50%. | Upload terminated; temporary chunks cleaned up; no scan created. | P1 | Medium | valid_scan.dcm | [ ] |
| TC-UPLD-011 | Upload Sanitization (EXIF/Header) | Doctor uploading valid DICOM | 1. Upload DICOM file containing non-ASCII metadata. | Saves safely to DB; special characters encoded correctly. | P2 | Low | unicode_scan.dcm | [ ] |
| TC-UPLD-012 | Audit Log on Scan Upload | Scan successfully uploaded | 1. View admin audit logs. | Entry recorded for action: 'SCAN_UPLOAD' with scan_id. | P1 | High | None | [ ] |
| TC-UPLD-013 | DICOM Path Structure in Storage | Scan successfully uploaded | 1. Inspect Minio storage buckets. | File stored under 'scans/<uuid>.dcm' structure. | P1 | High | None | [ ] |

### Module: DICOM Viewer

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-VIEW-001 | Viewer Loading Frame | Doctor is viewing scan details | 1. Click 'Open Viewer'. | DICOM viewer canvas loads with default image slice. | P1 | High | Scan ID | [ ] |
| TC-VIEW-002 | Zoom In/Out Controls | Viewer canvas is loaded | 1. Scroll mouse wheel up/down or click zoom buttons. | DICOM image zooms in/out smoothly. | P1 | Medium | None | [ ] |
| TC-VIEW-003 | Pan Image Navigation | Viewer is zoomed in | 1. Click and drag mouse over canvas. | DICOM image pans corresponding to mouse movement. | P1 | Medium | None | [ ] |
| TC-VIEW-004 | Brightness Adjustments (Window Width) | Viewer is loaded | 1. Drag right-click or use slider to adjust brightness. | Image brightness changes dynamically. | P1 | Medium | None | [ ] |
| TC-VIEW-005 | Contrast Adjustments (Window Level) | Viewer is loaded | 1. Drag right-click vertically or use level slider. | Image contrast updates accordingly. | P1 | Medium | None | [ ] |
| TC-VIEW-006 | Reset Viewer State | Viewer zoom/brightness altered | 1. Click 'Reset View' button. | Zoom, pan, brightness, and contrast revert to default. | P2 | Low | None | [ ] |
| TC-VIEW-007 | Tumor Mask Toggle ON | Viewer loaded, AI analysis complete | 1. Toggle 'Show AI Mask' switch to ON. | UNet segmentation mask overlays on image canvas. | P0 | High | None | [ ] |
| TC-VIEW-008 | Tumor Mask Toggle OFF | AI Mask is overlayed on viewer | 1. Toggle 'Show AI Mask' switch to OFF. | Mask overlay is hidden, showing raw DICOM image. | P1 | High | None | [ ] |
| TC-VIEW-009 | GradCAM Heatmap Overlay ON | Viewer loaded, AI analysis complete | 1. Toggle 'Show Heatmap' to ON. | GradCAM heatmap overlays with color gradient. | P1 | Medium | None | [ ] |
| TC-VIEW-010 | GradCAM Heatmap Overlay OFF | Heatmap is overlayed on viewer | 1. Toggle 'Show Heatmap' to OFF. | Heatmap overlay hidden. | P1 | Medium | None | [ ] |
| TC-VIEW-011 | Viewer Keyboard Shortcuts | Viewer is focused | 1. Press '+' and '-' keys. | Image zooms in and out respectively. | P2 | Low | None | [ ] |
| TC-VIEW-012 | Fullscreen Mode Toggle | Viewer is loaded | 1. Click fullscreen expand icon. | Viewer expands to fill screen; Esc key exits fullscreen. | P2 | Low | None | [ ] |
| TC-VIEW-013 | Double Mask Concurrency | Viewer loaded | 1. Toggle both AI Mask and Heatmap ON simultaneously. | Both overlays display overlaid correctly (e.g. blend opacity). | P2 | Low | None | [ ] |

### Module: AI Analysis

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-AIAN-001 | Trigger AI Analysis Success | Scan uploaded; status UPLOADED | 1. Click 'Run AI Analysis'. | Status transitions to ANALYSIS_PENDING then ANALYSIS_RUNNING. | P0 | Critical | Scan ID | [ ] |
| TC-AIAN-002 | AI Analysis Successful Completion | Analysis triggered | 1. Poll status until complete. | Status becomes ANALYSIS_COMPLETE; UNet mask and GradCAM generated. | P0 | Critical | Scan ID | [ ] |
| TC-AIAN-003 | AI Service Down Fallback | Analysis triggered, FastAPI unreachable | 1. Stop FastAPI container.<br>2. Poll status. | Scan status ends as ANALYSIS_COMPLETE using local fallback stub. | P0 | High | Scan ID | [ ] |
| TC-AIAN-004 | Tumor Volume Extraction Accuracy | Analysis complete | 1. Check scan details JSON. | Tumor volume (cc) is saved and displayed. | P1 | High | Scan ID | [ ] |
| TC-AIAN-005 | Tumor Location Generation | Analysis complete | 1. Check scan details JSON. | Tumor location description text generated (e.g. 'left frontal lobe'). | P1 | High | Scan ID | [ ] |
| TC-AIAN-006 | Trigger Analysis on Already Processing Scan | Scan status is ANALYSIS_RUNNING | 1. Attempt to send trigger API call again. | Request rejected with 400: 'Analysis already in progress'. | P1 | Medium | Scan ID | [ ] |
| TC-AIAN-007 | AI Output Files Check in Storage | Analysis complete | 1. Check Minio storage folders. | Mask saved at 'storage/masks/<id>.png'; Heatmap at 'storage/heatmaps/<id>.png'. | P1 | High | Scan ID | [ ] |
| TC-AIAN-008 | Invalid Scan Analysis Failure | Corrupted DICOM file uploaded | 1. Trigger AI analysis. | Scan status transitions to FAILED; inference log records error. | P1 | High | Scan ID | [ ] |
| TC-AIAN-009 | Multiple AI Analysis Queue Concurrency | Multiple scans uploaded | 1. Trigger analysis on 5 scans in parallel. | Celery workers process scans concurrently; all transition status correctly. | P1 | High | Scan IDs | [ ] |
| TC-AIAN-010 | FastAPI Pipeline ONNX Load Verification | AI Service starts up | 1. Watch FastAPI container log. | ONNX model loaded successfully; logs print: 'Model loaded'. | P1 | High | None | [ ] |
| TC-AIAN-011 | FastAPI Health Check Endpoint | AI service is running | 1. Send GET to http://ai-service/health. | Returns status ok with model versions. | P1 | Medium | None | [ ] |
| TC-AIAN-012 | Inference Logs Saved to DB | Analysis complete | 1. Inspect ScanAnalysis table. | inference_log field populated with execution details. | P2 | Low | Scan ID | [ ] |
| TC-AIAN-013 | Re-run AI Analysis Restriction | Scan is ANALYSIS_COMPLETE | 1. Attempt to trigger analysis again. | Rejected or ignored; no double processing. | P1 | Medium | Scan ID | [ ] |

### Module: Report Editing

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-RPED-001 | Create Draft Report Success | Scan is ANALYSIS_COMPLETE; no report draft | 1. Load scan details.<br>2. Click Create Report. | Draft report created with generated AI draft text in status DRAFT. | P0 | High | Scan ID | [ ] |
| TC-RPED-002 | Draft Report Form Display | Draft report exists | 1. Open report editor page. | Markdown editor loads with draft content. | P1 | Medium | Report ID | [ ] |
| TC-RPED-003 | Save Report Draft - Input Text | Report editor is open | 1. Edit draft text.<br>2. Click 'Save Draft' button. | Changes saved to DB; status remains DRAFT; success message displayed. | P0 | High | Report ID | [ ] |
| TC-RPED-004 | Discard Report Draft Changes | Report editor is open | 1. Edit draft text.<br>2. Click Cancel/Go Back without saving. | Changes are discarded; database retains previous draft content. | P1 | Medium | Report ID | [ ] |
| TC-RPED-005 | Markdown Editor Preview Toggle | Report editor is open | 1. Click 'Preview' tab in editor. | Markdown text is formatted into HTML preview. | P2 | Low | None | [ ] |
| TC-RPED-006 | Report Text Size Constraint (Empty) | Report editor open | 1. Clear draft text.<br>2. Click Save. | Rejected or alerts validation error; empty reports not allowed. | P1 | Medium | Report ID | [ ] |
| TC-RPED-007 | Report Text Size Constraint (Excessive) | Report editor open | 1. Enter 100,000 characters in editor.<br>2. Click Save. | Success or validation warning depending on limits. | P2 | Low | Report ID | [ ] |
| TC-RPED-008 | Auto-Save Draft Functionality | Report editor open | 1. Make edits.<br>2. Wait 30 seconds without clicking Save. | Draft automatically saved to backend; auto-save status indicator shown. | P1 | Medium | Report ID | [ ] |
| TC-RPED-009 | Prisma Trace on Report Edit | Report saved by doctor | 1. Check ReportCorrection table. | Old/New values recorded in corrections audit table. | P1 | High | Report ID | [ ] |
| TC-RPED-010 | Report Validation - Special Characters | Report editor open | 1. Insert emojis and symbols.<br>2. Click Save. | Saved and rendered correctly; no corruption. | P2 | Low | Report ID | [ ] |
| TC-RPED-011 | Concurrence Check on Editor Open | Doctor A is editing Report X | 1. Doctor B attempts to open Report X editor. | Warning badge displayed: 'Report is currently being edited by Doctor A'. | P2 | Low | Report ID | [ ] |
| TC-RPED-012 | Accessing Nonexistent Report | Doctor logged in | 1. Navigate directly to /doctor/reports/fake-uuid. | Redirected to dashboard with error: 'Report not found'. | P1 | Medium | None | [ ] |
| TC-RPED-013 | Unauthorized Report Editing | Doctor A is logged in | 1. Attempt to edit report assigned to Doctor B. | Error 403 Forbidden; cannot save edits. | P0 | High | Report ID | [ ] |

### Module: Report Approval

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-RPAP-001 | Approve Report Status Transition | Report status is DRAFT | 1. Open report.<br>2. Click 'Approve and Publish'. | Status updates to PUBLISHED; patient_visible set to true. | P0 | Critical | Report ID | [ ] |
| TC-RPAP-002 | Approved Report Un-Editable | Report status is PUBLISHED | 1. Open report view. | Edit button is hidden; navigate directly to edit URL returns 403. | P0 | High | Report ID | [ ] |
| TC-RPAP-003 | Approved Report Visible to Patient | Patient is logged in; report is PUBLISHED | 1. Check reports list. | Approved report is listed and accessible. | P0 | Critical | Report ID | [ ] |
| TC-RPAP-004 | Draft Report Hidden from Patient | Patient is logged in; report is DRAFT | 1. Check reports list. | Draft report is not listed. | P0 | Critical | Report ID | [ ] |
| TC-RPAP-005 | Toggle Patient Visibility Off | Doctor is viewing approved report | 1. Toggle 'Visible to Patient' switch to OFF. | patient_visible set to false; report hidden from patient portal. | P1 | High | Report ID | [ ] |
| TC-RPAP-006 | Toggle Patient Visibility On | Doctor is viewing approved report | 1. Toggle 'Visible to Patient' switch to ON. | patient_visible set to true; report visible to patient. | P1 | High | Report ID | [ ] |
| TC-RPAP-007 | Approve Button Disabled for Empty Report | Draft report has no final report text | 1. View report details. | Approve button is disabled. | P1 | Medium | Report ID | [ ] |
| TC-RPAP-008 | Audit Log on Report Approve | Doctor approves report | 1. View admin audit logs. | Entry logged for action 'REPORT_APPROVE' with report_id. | P1 | High | Report ID | [ ] |
| TC-RPAP-009 | Email Notification on Report Approve | Doctor approves report | 1. Watch email log. | Notification email sent to patient: 'Your report is ready'. | P0 | High | Report ID | [ ] |
| TC-RPAP-010 | Approval Status Validation in API | Send approve API call | 1. Send POST to /api/reports/id/approve on already approved report. | Rejected or returns status 200 with no state change. | P2 | Low | Report ID | [ ] |
| TC-RPAP-011 | Report Correction Record Generated | Report is edited then approved | 1. Query db for report corrections. | Correction logs saved with doctor_id and timestamp. | P1 | Medium | Report ID | [ ] |
| TC-RPAP-012 | Approve Report by Unassigned Doctor | Doctor A is logged in | 1. Attempt to approve Report B (assigned to Doctor B). | Error 403 Forbidden. | P0 | High | Report ID | [ ] |
| TC-RPAP-013 | Doctor Dashboard Updates after Approval | Report approved | 1. View doctor dashboard. | Approved scan moves from 'Pending Approval' queue to 'Completed'. | P1 | Medium | Report ID | [ ] |

### Module: Chatbot

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-CHAT-001 | Chat Widget Rendering | Patient is viewing published report | 1. Load report page. | Chat widget renders; shows welcome message. | P1 | High | Report ID | [ ] |
| TC-CHAT-002 | Submit Message to Chatbot | Chat widget is open | 1. Type message: 'What is a tumor?'<br>2. Click Send. | Message sent; loading indicator animates; bot replies. | P1 | High | Report ID | [ ] |
| TC-CHAT-003 | Chatbot Response Format | Message sent | 1. Check bot response format. | Response includes plaintext reply and sources list. | P1 | High | Report ID | [ ] |
| TC-CHAT-004 | RAG Pipeline - Specific Report Context | Patient asks specific question | 1. Ask: 'What is my tumor volume?' | Bot references volume from scan analysis (e.g. 'Your tumor volume is 12.3 cc'). | P0 | High | Report ID | [ ] |
| TC-CHAT-005 | RAG Pipeline - Out of Context Question | Patient asks irrelevant question | 1. Ask: 'Tell me a joke.' | Bot replies with guardrail: 'I can only discuss findings in your report...'. | P1 | High | None | [ ] |
| TC-CHAT-006 | Chatbot Rate Limiting | Patient sends message | 1. Send 15 messages in 10 seconds. | Rejected with 429: 'Too many requests. Please try again later.' | P1 | High | None | [ ] |
| TC-CHAT-007 | Chat History Retention | Patient leaves page and returns | 1. Close report view.<br>2. Open report view again. | Previous chat messages load from DB. | P1 | Medium | Report ID | [ ] |
| TC-CHAT-008 | Empty Message Submission Block | Chat widget open | 1. Leave input empty.<br>2. Click Send. | Button disabled; form submission blocked. | P2 | Low | None | [ ] |
| TC-CHAT-009 | Excessively Long Message Handling | Chat widget open | 1. Paste 5000 words.<br>2. Click Send. | Message truncated or validation error shown. | P2 | Low | None | [ ] |
| TC-CHAT-010 | Chatbot API Authentication | User logged out | 1. Send POST to /api/chat/id/message. | Rejected with 401 Unauthorized. | P0 | Critical | None | [ ] |
| TC-CHAT-011 | Chat Session Unique Constraint | Same patient and report | 1. Attempt to create new chat session. | Returns existing chat session; no duplicate session created in DB. | P1 | High | Report ID | [ ] |
| TC-CHAT-012 | Bot Message Attribution | Message received | 1. Inspect ChatMessage record. | sender is set to 'BOT'. | P1 | Medium | None | [ ] |
| TC-CHAT-013 | Patient Message Attribution | Message sent | 1. Inspect ChatMessage record. | sender is set to 'PATIENT'. | P1 | Medium | None | [ ] |

### Module: Appointments

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-APPT-001 | View Availability Grid | Doctor logged in | 1. Open Schedule settings. | Weekly slots grid displayed accurately. | P1 | Medium | None | [ ] |
| TC-APPT-002 | Add Availability Slot Success | Doctor logged in | 1. Select Wednesday 10-12.<br>2. Click Add. | Slot added; status updated in grid. | P1 | High | Wed 10:00 - 12:00 | [ ] |
| TC-APPT-003 | Add Overlapping Availability Slot | Doctor logged in, slot exists | 1. Attempt to add slot that overlaps (e.g. Wed 10:30-11:30). | Validation error: 'Time slot overlaps with an existing slot.' | P1 | High | Wed 10:30 - 11:30 | [ ] |
| TC-APPT-004 | Patient Lists Available Slots | Patient logged in | 1. Choose doctor from booking list. | Displays available slots correctly. | P1 | High | Doctor ID | [ ] |
| TC-APPT-005 | Patient Book Slot Success | Patient logged in | 1. Click book on slot Mon 9-10. | Appointment created; status PENDING. | P0 | Critical | Doctor ID, Slot | [ ] |
| TC-APPT-006 | Double Booking Prevention | Patient A booked Mon 9-10 | 1. Patient B attempts to book the same slot. | Slot not listed for Patient B, API rejects duplicate book with 409. | P0 | Critical | Doctor ID, Slot | [ ] |
| TC-APPT-007 | Doctor Confirms Appointment | Doctor logged in | 1. Click Confirm on pending appointment. | Status changed to CONFIRMED; confirmation email sent to patient. | P0 | High | Appointment ID | [ ] |
| TC-APPT-008 | Doctor Rejects/Cancels Appointment | Doctor logged in | 1. Click Cancel on appointment. | Status changed to CANCELLED; cancellation email sent. | P1 | High | Appointment ID | [ ] |
| TC-APPT-009 | Patient Cancels Appointment | Patient logged in | 1. Click Cancel on dashboard. | Status changed to CANCELLED; email notification sent to doctor. | P1 | High | Appointment ID | [ ] |
| TC-APPT-010 | Appointment View Filter by Status | User logged in | 1. Filter by CONFIRMED. | Only confirmed appointments displayed. | P2 | Medium | None | [ ] |
| TC-APPT-011 | Appointment Completion Flow | Appointment time has passed | 1. Doctor updates appointment to COMPLETED. | Status updated; patient allowed to leave review (if supported). | P2 | Low | Appointment ID | [ ] |
| TC-APPT-012 | Book Appointment in Past Block | Patient booking flow | 1. Attempt to book a slot that has already passed. | Time slot disabled/unselectable; API validation blocks request. | P1 | High | Past date slot | [ ] |
| TC-APPT-013 | Database Constraint Unique Slot | Send raw API SQL insert | 1. Attempt to insert duplicate doctor_id/start_time/end_time in DB. | Fails with unique constraint validation. | P1 | High | Duplicate slot | [ ] |

### Module: Notifications

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-NOTI-001 | Email Verification Sent | User registered | 1. Monitor SMTP output. | Verification email sent; contains valid link. | P0 | High | None | [ ] |
| TC-NOTI-002 | Password Reset Email Sent | Forgot password submitted | 1. Monitor SMTP output. | Reset email sent; contains valid token link. | P0 | High | None | [ ] |
| TC-NOTI-003 | Appointment Confirmed Email | Doctor confirms appointment | 1. Monitor SMTP. | Email notification sent with appointment details. | P1 | High | None | [ ] |
| TC-NOTI-004 | Appointment Cancelled Email | User cancels appointment | 1. Monitor SMTP. | Email notification sent to other party. | P1 | High | None | [ ] |
| TC-NOTI-005 | Report Approved Email | Doctor approves report | 1. Monitor SMTP. | Email notification sent to patient: 'Your analysis is ready'. | P0 | High | None | [ ] |
| TC-NOTI-006 | Email Sender Configuration | Email is triggered | 1. Check outgoing email headers. | from address matches SMTP_FROM config. | P2 | Low | None | [ ] |
| TC-NOTI-007 | Ethereal Local Fallback Logging | SMTP not configured | 1. Check server logs after registration. | Logs show preview URL link for Ethereal email. | P1 | Medium | None | [ ] |
| TC-NOTI-008 | Invalid Email Address Rejection | Register user | 1. Register with email that has invalid domains. | Rejected by server; mailer skips sending. | P2 | Medium | test@invalid... | [ ] |
| TC-NOTI-009 | SMTP Server Connection Timeout | SMTP host is wrong in config | 1. Trigger registration.<br>2. Monitor server logs. | Throws error log; server does not crash; handles gracefully. | P1 | High | None | [ ] |
| TC-NOTI-010 | Real-time App Notification Banner | Doctor logs in; scan finishes | 1. Watch top navbar. | Banner alerts: 'Scan analysis completed' when webhook hits. | P2 | Medium | None | [ ] |
| TC-NOTI-011 | Clear Notification Action | Notifications list is open | 1. Click 'Mark as read' next to alert. | Notification hidden; status updated in local state. | P2 | Low | None | [ ] |
| TC-NOTI-012 | Notifications Count Badge | New scan analysis completed | 1. Check icon badge count. | Increments count badge by 1 in header. | P2 | Low | None | [ ] |
| TC-NOTI-013 | Bulk Dismiss Notifications | Notifications dropdown open | 1. Click 'Clear All'. | Count badge reset to 0; all notifications marked read. | P2 | Low | None | [ ] |

### Module: Storage

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-STOR-001 | DICOM Path Saved in DB | Scan successfully uploaded | 1. Inspect Scan table. | dicom_path holds absolute storage location. | P1 | High | Scan ID | [ ] |
| TC-STOR-002 | UNet Mask Path Saved in DB | AI analysis complete | 1. Inspect ScanAnalysis table. | unet_mask_path holds mask storage location. | P1 | High | Scan ID | [ ] |
| TC-STOR-003 | GradCAM Path Saved in DB | AI analysis complete | 1. Inspect ScanAnalysis table. | gradcam_path holds heatmap storage location. | P1 | High | Scan ID | [ ] |
| TC-STOR-004 | S3 Bucket File Deletion on Scan Delete | Scan is deleted by doctor | 1. Click delete scan.<br>2. Check S3 bucket. | DICOM file, mask file, and heatmap files are removed from storage. | P1 | High | Scan ID | [ ] |
| TC-STOR-005 | Minio Dashboard Storage Validation | Direct Minio interface | 1. Log into Minio UI.<br>2. Navigate to 'curavision' bucket. | Directories for 'scans', 'masks', and 'heatmaps' exist. | P1 | Medium | None | [ ] |
| TC-STOR-006 | Storage Operations Error Resilience | Minio is down | 1. Upload a DICOM file. | Graceful error: 'Storage service temporarily unavailable' (500). | P1 | High | None | [ ] |
| TC-STOR-007 | Secure Storage Link Generation | Viewer loads scan image | 1. Inspect image source URLs. | URLs are pre-signed with short expiry (e.g. 1 hour). | P1 | High | None | [ ] |
| TC-STOR-008 | Expired Pre-signed URL Rejection | 1 hour passed after URL generation | 1. Attempt to access image link. | Access denied; S3 XML returns expired error. | P1 | High | Expired URL | [ ] |
| TC-STOR-009 | Read-only Storage IAM Policy | Access keys used by backend | 1. Attempt to delete storage folder from client API. | Access denied; policy limits write/delete. | P0 | High | None | [ ] |
| TC-STOR-010 | Storage Duplication Prevention | Same DICOM uploaded twice | 1. Upload identical file. | Uploaded with unique filename UUID to prevent overwriting. | P1 | High | None | [ ] |

### Module: Security

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-SECU-001 | CSRF Protection Mutating Route Block | Send POST request to /api/auth/login | 1. Exclude x-xsrf-token header and XSRF-TOKEN cookie.<br>2. Send request. | Request rejected with 403: 'Invalid or missing CSRF token'. | P0 | Critical | None | [ ] |
| TC-SECU-002 | CSRF Protection Safe Method Bypass | Send GET request to /health | 1. Exclude CSRF tokens. | Request allowed; returns 200 ok. | P1 | High | None | [ ] |
| TC-SECU-003 | Rate Limiting on Authentication | Auth route triggered | 1. Send 100 login attempts in 1 minute. | IP gets blocked; returns 429: 'Too many login attempts'. | P0 | Critical | None | [ ] |
| TC-SECU-004 | General API Rate Limiting | General API route | 1. Send 1000 requests in 1 minute to /api/scans. | Rejected with 429: 'Too many requests'. | P1 | High | None | [ ] |
| TC-SECU-005 | CORS Policy - Wildcard production block | Server starts in production | 1. Start backend with env CORS_ORIGIN='*' and NODE_ENV='production'. | Backend exits immediately; prints: 'CORS_ORIGIN=* is not allowed in production'. | P0 | Critical | None | [ ] |
| TC-SECU-006 | CORS Policy - Allowed Origin success | Request from allowed frontend port | 1. Send request with origin header: 'http://localhost:3000'. | Request accepted; contains access-control-allow-origin header. | P1 | High | None | [ ] |
| TC-SECU-007 | CORS Policy - Dissallowed Origin block | Request from fake origin | 1. Send request with header origin: 'http://evil.com'. | Rejected with 'Origin http://evil.com is not allowed by CORS'. | P0 | Critical | None | [ ] |
| TC-SECU-008 | SQL Injection Protection - User inputs | Search user profiles | 1. Input query: "' OR '1'='1". | Query executes safely as parameter; no records exposed. | P0 | Critical | Injection query | [ ] |
| TC-SECU-009 | XSS Script Filtering in Report Editor | Doctor editing report | 1. Insert '<script>alert(1)</script>' in markdown editor.<br>2. Click Save. | Script tags sanitized/escaped; text renders as string; no script runs. | P0 | Critical | Script injection | [ ] |
| TC-SECU-010 | JWT Signature Algorithm Validation | JWT token sent | 1. Edit token header to use 'HS256' but signed with different keys. | Verification fails; token rejected. | P0 | Critical | Fake signature | [ ] |
| TC-SECU-011 | Database Password Hashing | User records in database | 1. Query users table directly. | Passwords saved as bcrypt hashes; no plaintext. | P0 | Critical | None | [ ] |
| TC-SECU-012 | HTTPS Enforcement Redirects | App deployed to cloud | 1. Access site via http://. | Automatically redirected to https://. | P1 | High | None | [ ] |
| TC-SECU-013 | Security Headers Presence | API response inspected | 1. Check headers. | Includes: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security. | P1 | High | None | [ ] |
| TC-SECU-014 | Sanitize URL Inputs (SQL Injection) | Navigate to reports API | 1. Request /api/reports/1%20UNION%20SELECT. | Sanitized, returns 400 or empty; SQL injection fails. | P0 | Critical | Injection query | [ ] |
| TC-SECU-015 | Directory Traversal Block | Send path traversal payloads | 1. GET /api/scans/../../etc/passwd. | Rejected; status 400 Bad Request. | P0 | Critical | Traversal path | [ ] |
| TC-SECU-016 | No plaintext secrets in logs | System logs inspected | 1. Trigger database initialization error. | Logs show connection errors but password is redacted. | P1 | High | None | [ ] |
| TC-SECU-017 | CSRF Header Token Mismatch | Submit POST request | 1. Send valid token in cookie but mismatched token in header. | Rejected with 403 Forbidden. | P0 | Critical | None | [ ] |
| TC-SECU-018 | CSRF Token Refresh on Logout | Logout action triggered | 1. Log out user. | CSRF cookie is updated or invalidated. | P1 | Medium | None | [ ] |

### Module: Error Handling

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-ERRH-001 | Database Connectivity Loss | Database container stopped | 1. Access dashboard / GET api/scans. | Error page/alert shown: 'Database connection failed' (500). | P1 | High | None | [ ] |
| TC-ERRH-002 | AI Server Webhook Parse Failure | Webhook endpoint receives corrupted JSON | 1. POST /api/internal/scans/id/analysis-complete with invalid body. | Rejected with 400 Bad Request; server does not crash. | P1 | High | None | [ ] |
| TC-ERRH-003 | Nonexistent Route 404 Display | Navigate to wrong URL | 1. Open /api/not-a-route. | Returns 404 page/JSON: 'Route not found'. | P2 | Low | None | [ ] |
| TC-ERRH-004 | Supertest Assertions Error Catching | Mock service fails in routes test | 1. Trigger route error code. | Status code captured correctly; response matches assertions. | P2 | Low | None | [ ] |
| TC-ERRH-005 | Invalid Payload Validation (scans) | Upload scan API | 1. Send body with missing modality. | Returns 400 with detailed schema field validation errors. | P1 | High | None | [ ] |
| TC-ERRH-006 | Token Decoding Error Handling | Send malformed Authorization header | 1. Send header: 'Bearer 123'. | Returns 401: 'Invalid token'. | P1 | High | None | [ ] |
| TC-ERRH-007 | Upload Directory Permissions Error | Write permissions revoked in media folder | 1. Upload scan. | Handles error gracefully; returns 500 status. | P2 | Medium | None | [ ] |
| TC-ERRH-008 | File Format Validation | Upload scan API | 1. Upload a valid DICOM but change extension to .png. | Backend checks file magic numbers; rejects file with 400. | P1 | High | test.png | [ ] |
| TC-ERRH-009 | Prisma Client Initialization Fail | Database starts slowly | 1. Start app.<br>2. Attempt DB call before ready. | Retries connection; fails gracefully if max attempts exceeded. | P1 | Medium | None | [ ] |
| TC-ERRH-010 | Chatbot Timeout Resilience | OpenAI/LLM server timeouts | 1. Ask chatbot query.<br>2. Simulate 30s timeout. | Displays message: 'Chat service timed out. Please try again.' | P1 | Medium | None | [ ] |
| TC-ERRH-011 | Invalid Scan ID on Viewer Page | Open viewer | 1. Navigate to /doctor/viewer/fake-uuid. | Redirected to scan queue; error toast shown. | P1 | Medium | None | [ ] |
| TC-ERRH-012 | CSRF Token Missing Response Format | POST without CSRF header | 1. Request POST endpoint. | JSON structure contains code 'CSRF_ERROR' and message description. | P2 | Low | None | [ ] |
| TC-ERRH-013 | FastAPI Input Sanitization Error | Trigger analysis with malformed coordinates | 1. Send trigger command with invalid data structure. | AI Service returns validation error payload safely; no crash. | P1 | High | Malformed JSON | [ ] |
| TC-ERRH-014 | Prisma Connection Pool Starvation | Send 1000 concurrent database queries | 1. Load database heavily. | Queries queue up; connection timeouts handled gracefully; server stays alive. | P1 | High | None | [ ] |
| TC-ERRH-015 | Frontend Offline Alert Banner | Network disconnected | 1. Toggle offline mode in browser. | Banner alerts: 'You are currently offline. Retrying...'. | P2 | Medium | None | [ ] |
| TC-ERRH-016 | DICOM File Format Magic Bytes Check | Upload fake file with dcm extension | 1. Create text file with .dcm extension.<br>2. Upload file. | Backend reads headers, rejects with 'Invalid DICOM file metadata' (400). | P1 | High | fake.dcm | [ ] |
| TC-ERRH-017 | Minio Connection Fail Fallback | S3 Storage offline | 1. Attempt to view scan. | Error alerts: 'Failed to retrieve scan image. Please contact support.' | P1 | High | None | [ ] |

### Module: Performance

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-PERF-001 | Dashboard Page Load Time | Network inspector open | 1. Load dashboard. | LCP is under 2.5 seconds. | P1 | High | None | [ ] |
| TC-PERF-002 | DICOM Render Performance | Large scan opened in viewer | 1. Load scan image canvas. | First frame renders in under 1 second. | P1 | Medium | None | [ ] |
| TC-PERF-003 | Chatbot Response Latency | Submit bot question | 1. Click Send. | Typing status appears instantly; response starts rendering within 3 seconds. | P1 | Medium | None | [ ] |
| TC-PERF-004 | AI Pipeline Queue Processing Time | Scan submitted | 1. Trigger analysis. | Job processed by celery queue in under 10 seconds (with local stub). | P1 | High | None | [ ] |
| TC-PERF-005 | Database Query Index Verification | Large scan history | 1. Fetch scans list. | scans fetch query uses index on patient_id/doctor_id; runs in <100ms. | P1 | High | None | [ ] |
| TC-PERF-006 | Memory Usage Stability (Leak Test) | Viewer page open | 1. Zoom and toggle mask ON/OFF 50 times. | Memory usage profile remains flat; no WebGL/JS memory leak. | P1 | High | None | [ ] |
| TC-PERF-007 | Backend API Response Time (under load) | Artillery run | 1. Run performance load script simulating 100 virtual users. | 99th percentile response time is under 500ms. | P1 | High | None | [ ] |
| TC-PERF-008 | Minio Image Download Performance | Retrieve pre-signed links | 1. Render image slices. | Image chunks fetch from Minio bucket in under 200ms. | P2 | Medium | None | [ ] |
| TC-PERF-009 | Redis Cache Lookup Time | Ask repeat question to bot | 1. Ask same prompt twice. | Second response retrieved from Redis cache instantly (<20ms). | P1 | High | None | [ ] |
| TC-PERF-010 | Production Bundle Build Asset Size | Production build compiled | 1. Check JS/CSS bundle size. | JS entry bundle is under 300KB (gzipped). | P2 | Low | None | [ ] |

### Module: Responsive Design

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-RESP-001 | Mobile Dashboard Layout (320px) | Mobile viewport | 1. Load dashboard on 320px viewport. | Layout wraps into a single column; sidebar collapses to hamburger menu. | P1 | Medium | None | [ ] |
| TC-RESP-002 | Mobile Hamburger Menu Toggle | Mobile viewport | 1. Click hamburger menu icon. | Drawer menu expands; clicking outside closes it. | P1 | Medium | None | [ ] |
| TC-RESP-003 | Tablet Layout (768px) | Tablet viewport | 1. View dashboard on 768px. | Grid columns adapt cleanly; no horizontal scrolling. | P1 | Medium | None | [ ] |
| TC-RESP-004 | Desktop Layout Grid (1200px+) | Desktop screen | 1. Load dashboard on 1200px+. | Multi-column layout loads; sidebar fixed left. | P1 | Medium | None | [ ] |
| TC-RESP-005 | DICOM Viewer Responsive Canvas | Mobile/Tablet viewport | 1. Load viewer page.<br>2. Rotate screen. | Canvas scales dynamically to fit screen limits. | P1 | High | None | [ ] |
| TC-RESP-006 | Form Wrap on Mobile | Booking/Registration pages | 1. Open forms on mobile viewport. | All text fields stack vertically; tap targets are large enough. | P2 | Low | None | [ ] |
| TC-RESP-007 | Table Responsiveness (Scans queue) | Table component | 1. Open scans queue on mobile. | Table scrolls horizontally or wraps into cards. | P2 | Low | None | [ ] |
| TC-RESP-008 | Modal Dialog Layout Mobile | Upload/Appointments modal open | 1. Open modal on mobile. | Modal resizes to fill screen width with padding; scrollable if content overflows. | P2 | Low | None | [ ] |
| TC-RESP-009 | Typography Scaling | All screens | 1. View typography on different breakpoints. | Font sizes adjust using relative units (rem/em/vh). | P2 | Low | None | [ ] |
| TC-RESP-010 | Image Grid Responsiveness | Gallery/Scans grid | 1. Load page on various displays. | Grid adapts (e.g. 4 cols on desktop, 2 on tablet, 1 on mobile). | P2 | Low | None | [ ] |

### Module: Accessibility

| Test ID | Feature | Preconditions | Test Steps | Expected Result | Priority | Severity | Test Data | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| TC-ACCS-001 | Keyboard Navigation Focus Ring | Dashboard loaded | 1. Press Tab key to navigate UI. | Focus outline indicator is highly visible on all active links. | P1 | High | None | [ ] |
| TC-ACCS-002 | Keyboard Navigation Logical Order | Dashboard loaded | 1. Tab through elements. | Focus moves sequentially from top-left to bottom-right. | P1 | Medium | None | [ ] |
| TC-ACCS-003 | Screen Reader Semantic Landmark Tags | Inspect page DOM | 1. Check page tags. | Uses semantic HTML tags (<header>, <nav>, <main>, <footer>). | P1 | Medium | None | [ ] |
| TC-ACCS-004 | Aria-Label Image Descriptions | Inspect page DOM | 1. Verify DICOM viewer canvas tags. | Canvas contains descriptive aria-label (e.g. 'DICOM scan viewer canvas'). | P1 | High | None | [ ] |
| TC-ACCS-005 | Contrast Ratio compliance | Page elements checked | 1. Inspect color contrast of text against background. | Contrast ratio is at least 4.5:1 (WCAG AA standard). | P1 | High | None | [ ] |
| TC-ACCS-006 | Dialog Modal Keyboard Focus Trap | Upload scan modal is open | 1. Press Tab repeatedly. | Focus remains locked inside modal; cannot escape to background. | P1 | High | None | [ ] |
| TC-ACCS-007 | Dialog Modal Close on Esc | Upload scan modal is open | 1. Press 'Escape' key. | Modal closes automatically; focus returns to trigger button. | P1 | Medium | None | [ ] |
| TC-ACCS-008 | Image Alt Text Attributes | All static page images | 1. Check img tags. | All images contain appropriate alt tags. | P2 | Low | None | [ ] |
| TC-ACCS-009 | Form Field Input Label Association | Registration form | 1. Check label tags. | All inputs contain associated labels or aria-labelledby attributes. | P1 | High | None | [ ] |
| TC-ACCS-010 | Aria-Live Region Alerts | Error/Success toasts shown | 1. Trigger success toast. | Uses aria-live='polite'; screen reader reads out content. | P1 | Medium | None | [ ] |
| TC-ACCS-011 | Text Resizing Support | Browser zoom set to 200% | 1. Increase font zoom to 200%. | Text scales cleanly; no layout break or text overlaps. | P2 | Low | None | [ ] |
| TC-ACCS-012 | Color-Blind Mode Toggle | Profile settings | 1. Select color-blind mode. | Viewer segmentation overlay colors adjust for high visibility. | P2 | Low | None | [ ] |
| TC-ACCS-013 | Skip to Content Link | Load dashboard page | 1. Press Tab first thing after loading. | 'Skip to main content' link appears; pressing Enter focuses main tag. | P2 | Low | None | [ ] |
| TC-ACCS-014 | Form Input Invalid States | Form fields submit validation failed | 1. Check input attributes. | Inputs have aria-invalid='true' and link to error descriptions. | P1 | Medium | None | [ ] |
| TC-ACCS-015 | Screen Reader Announcement of Scan Status Changes | Scan status transitions from Running to Complete | 1. Observe background notifications. | Aria-live element alerts patient/doctor screen reader of update. | P2 | Low | None | [ ] |

