import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Full Game Flow - Host Solo', () => {
  test('host can create room, start round with 1 game, make all guesses, and view results', async ({ page }) => {
    // Step 1: Create room as host
    await page.goto('/');

    await page.getByPlaceholder(/Enter your name/i).first().fill('Solo Host');
    await page.getByPlaceholder(/Room name \(optional\)/i).fill('Solo Test Room');
    await page.getByRole('button', { name: /Create Room/i }).click();

    // Wait for room page to load
    await expect(page).toHaveURL(/\/room\/.+/, { timeout: 10000 });
    await page.waitForSelector('text=/WorldleParty Room/i', { timeout: 10000 });

    await takeScreenshot(page, 'room-created');

    // Step 2: Create first round with 1 game
    const createRoundButton = page.locator('button:has-text("Create First Round"), button:has-text("New Round")').first();
    await expect(createRoundButton).toBeVisible({ timeout: 5000 });
    await createRoundButton.click();

    // Fill round settings - 1 game, 5 attempts, 300 seconds
    await page.getByPlaceholder(/Round/i).fill('Test Round');

    // Set games to 1
    const gamesInput = page.locator('input[type="number"]').first();
    await gamesInput.fill('1');

    // Set max attempts to 5 (should be default)
    const attemptsInput = page.locator('input[type="number"]').nth(1);
    await attemptsInput.fill('5');

    // Set time limit to 300 seconds
    const timeInput = page.locator('input[type="number"]').nth(2);
    await timeInput.fill('300');

    await page.getByRole('button', { name: /Create Round/i }).click();

    await takeScreenshot(page, 'round-created');

    // Step 3: Start the round
    await page.getByRole('button', { name: /Start Round/i }).click();

    // Should redirect to game page
    await expect(page).toHaveURL(/\/game\/.+/, { timeout: 10000 });
    await page.waitForSelector('text=/Round.*Game.*of.*1/i', { timeout: 10000 });

    await takeScreenshot(page, 'game-started');

    // Step 4: Make 5 guesses (4 wrong, 1 correct)
    const guessInput = page.getByPlaceholder(/Type a country name/i);
    await expect(guessInput).toBeVisible({ timeout: 5000 });

    // Make 4 incorrect guesses first
    const wrongGuesses = ['Canada', 'Australia', 'Germany', 'Japan'];

    for (let i = 0; i < wrongGuesses.length; i++) {
      await guessInput.fill(wrongGuesses[i]);

      // Wait for suggestions and click the first one
      const suggestion = page.locator(`button:has-text("${wrongGuesses[i]}")`).first();
      await expect(suggestion).toBeVisible({ timeout: 3000 });
      await suggestion.click();

      // Wait for the guess to be processed
      await page.waitForSelector(`text=${i + 1}/5 attempts`, { timeout: 5000 });

      await takeScreenshot(page, `guess-${i + 1}-wrong`);
    }

    // Now we need to make the correct guess - let's extract what country we need to guess
    // We'll look for the attempts counter to make sure we're at 4/5
    await expect(page.locator('text=4/5 attempts')).toBeVisible();

    // For the final guess, we'll try a few common countries until we get it right
    // Since we don't know the answer, we'll make educated guesses
    const possibleCorrectGuesses = ['France', 'Italy', 'Spain', 'United Kingdom', 'Brazil', 'United States', 'China', 'India', 'Russia'];

    let gameCompleted = false;
    for (const guess of possibleCorrectGuesses) {
      await guessInput.fill(guess);

      const suggestion = page.locator(`button:has-text("${guess}")`).first();
      if (await suggestion.isVisible({ timeout: 2000 })) {
        await suggestion.click();

        // Check if game is completed (either success or failure)
        try {
          await page.waitForSelector('text=/Completed!|Failed|All Players Completed/i', { timeout: 3000 });
          gameCompleted = true;
          break;
        } catch {
          // Continue to next guess if not completed
          continue;
        }
      }
    }

    // If we haven't completed the game yet, just make one more guess to trigger completion
    if (!gameCompleted) {
      await guessInput.fill('Mexico');
      const suggestion = page.locator('button:has-text("Mexico")').first();
      if (await suggestion.isVisible({ timeout: 2000 })) {
        await suggestion.click();
      }

      // Game should be completed now (either success or failure after 5 attempts)
      await page.waitForSelector('text=/Completed!|Failed|All Players Completed/i', { timeout: 5000 });
    }

    await takeScreenshot(page, 'game-completed');

    // Step 5: Finish the round and go to results
    const finishButton = page.locator('button:has-text("Finish Round"), button:has-text("Next Game")').first();
    await expect(finishButton).toBeVisible({ timeout: 5000 });
    await finishButton.click();

    // Should redirect to results page
    await expect(page).toHaveURL(/\/results\/.+/, { timeout: 10000 });

    // Wait for results page to load
    await page.waitForSelector('text=/Game Complete|Winner/i', { timeout: 10000 });

    // Check that results page elements are present
    await expect(page.locator('text=/Final Leaderboard/i')).toBeVisible();

    // Check for action buttons
    await expect(page.getByRole('button', { name: /Start New Game/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    await takeScreenshot(page, 'results-screen');

    console.log('✅ Full game flow completed successfully');
  });

});

async function takeScreenshot(page: import('@playwright/test').Page, name: string) {
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
