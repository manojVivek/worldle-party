import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('App Loading', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/WorldleParty/);

    // Check that the main heading is visible
    const heading = page.getByRole('heading', { name: /WorldleParty/i });
    await expect(heading).toBeVisible();

    // Check that the "Create Room" button is present
    const createRoomButton = page.getByRole('button', { name: /Create Room/i });
    await expect(createRoomButton).toBeVisible();

    // Check that host name input is present
    const hostNameInput = page.getByPlaceholder(/Enter your name/i).first();
    await expect(hostNameInput).toBeVisible();

    // Check that room name input is present
    const roomNameInput = page.getByPlaceholder(/Room name \(optional\)/i);
    await expect(roomNameInput).toBeVisible();

    // Take screenshot after successful validation
    await takeScreenshot(page, 'homepage-loaded');
  });

  test('can create room with database', async ({ page }) => {
    await page.goto('/');

    // Fill in host name
    await page.getByPlaceholder(/Enter your name/i).first().fill('E2E Test Host');

    // Click the Create Room button
    await page.getByRole('button', { name: /Create Room/i }).click();

    // Should redirect to a room page
    await expect(page).toHaveURL(/\/room\/.+/, { timeout: 10000 });

    // Check that we're on a room page - look for WorldleParty Room text
    await page.waitForSelector('text=/WorldleParty Room/i', { timeout: 10000 });
    const roomHeader = page.getByText(/WorldleParty Room/i);
    await expect(roomHeader).toBeVisible();

    // Check that the invite section is visible
    const inviteSection = page.getByText(/Invite Friends/i);
    await expect(inviteSection).toBeVisible();

    // Take screenshot after successful room creation
    await takeScreenshot(page, 'room-created');
  });
});

async function takeScreenshot(page: any, name: string) {
  const reportsDir = process.env.E2E_REPORTS_DIR;
  const projectId = process.env.E2E_PROJECT_ID;
  
  if (reportsDir) {
    const screenshotsDir = path.join(reportsDir, 'screenshots');
    fs.mkdirSync(screenshotsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${projectId}-${name}-${timestamp}.png`;
    const screenshotPath = path.join(screenshotsDir, filename);
    
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);
  }
}
