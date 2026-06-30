import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('CuraVision End-to-End Workflow', () => {
  let mockDicomPath: string;

  test.beforeAll(() => {
    // Generate a valid mock DICOM file (132 bytes minimum, offset 128 has 'DICM')
    const buffer = Buffer.alloc(132);
    buffer.write('DICM', 128, 'ascii');
    mockDicomPath = path.join(__dirname, 'mock_scan.dcm');
    fs.writeFileSync(mockDicomPath, buffer);
  });

  test.afterAll(() => {
    if (fs.existsSync(mockDicomPath)) {
      fs.unlinkSync(mockDicomPath);
    }
  });

  test('Doctor uploads scan and patient chats about it', async ({ page, context }) => {
    // --- Step 1: Doctor Login ---
    await page.goto('/login');
    await page.fill('input[type="email"]', 'doctor@curavision.com');
    await page.fill('input[type="password"]', 'Doctor@123');
    await page.click('button[type="submit"]');

    // Wait for redirect to doctor portal
    await expect(page).toHaveURL(/\/doctor/);
    await expect(page.locator('text=Dr. Ahmed Khalil')).toBeVisible();

    // --- Step 2: Upload Scan ---
    await page.goto('/doctor/upload');
    
    // Select patient
    await page.selectOption('select', { label: 'Sara Hassan — patient1@curavision.com' });
    
    // Choose the mock DICOM file
    await page.setInputFiles('input[type="file"]', mockDicomPath);

    // Click Upload & Analyse
    await page.click('button:has-text("Upload & Analyse")');

    // Wait for redirection to scan details page
    await expect(page).toHaveURL(/\/doctor\/scans\/[a-f0-9-]+/);

    // --- Step 3: Verify Analysis & Approve Report ---
    // Wait for analysis status to complete
    await expect(page.locator('text=Analysis Complete')).toBeVisible({ timeout: 45000 });
    
    // Validate report elements are visible
    await expect(page.locator('text=AI Draft Findings')).toBeVisible();

    // Approve report
    await page.click('button:has-text("Approve Report")');
    await expect(page.locator('text=Report Approved & Published')).toBeVisible();

    // --- Step 4: Patient Login & Chat ---
    await context.clearCookies();
    
    await page.goto('/login');
    await page.fill('input[type="email"]', 'patient1@curavision.com');
    await page.fill('input[type="password"]', 'Patient@123');
    await page.click('button[type="submit"]');

    // Redirect to patient portal
    await expect(page).toHaveURL(/\/patient/);
    await expect(page.locator('text=Sara Hassan')).toBeVisible();

    // Open the approved report
    await page.click('text=Ahmed Khalil');
    await expect(page.locator('text=Approved Report')).toBeVisible();

    // Open Chatbot and ask question
    await page.click('button:has-text("Chat"), text=Ask CuraVision');
    await page.fill('input[placeholder*="Ask" i]', 'What does left temporal lobe mean?');
    await page.click('button:has-text("Send"), button[type="submit"]');

    // Verify response
    await expect(page.locator('.chat-message-bot, .message-bot')).toContainText(/temporal/i, { timeout: 30000 });
    await expect(page.locator('text=Sources:')).toBeVisible();
  });
});
