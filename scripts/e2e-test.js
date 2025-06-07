#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const { randomBytes } = require('crypto');
const fs = require('fs');
const path = require('path');
const net = require('net');

// Find an available port
async function getRandomPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

// Generate project ID for this test run
function generateProjectId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
}

// Wait for a service to be ready
async function waitForService(url, maxAttempts = 30, delay = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`Service at ${url} is ready`);
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`Service at ${url} failed to start after ${maxAttempts} attempts`);
}

async function main() {
  const projectId = generateProjectId();
  const appPort = await getRandomPort();
  
  console.log(`Starting E2E tests with:
  - Project ID: ${projectId}
  - App Port: ${appPort}
  `);

  // Create organized directory structure for e2e tests
  const e2eTestsDir = path.join(__dirname, '..', '.e2e-tests');
  const testRunDir = path.join(e2eTestsDir, 'runs', projectId);
  const testConfigPath = path.join(testRunDir, 'supabase');
  const reportsDir = path.join(testRunDir, 'reports');
  
  fs.mkdirSync(testConfigPath, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  // Copy supabase config
  fs.cpSync(
    path.join(__dirname, '..', 'supabase'),
    path.join(testConfigPath, 'supabase'),
    { recursive: true }
  );

  let appProcess;

  try {
    // Start Supabase
    console.log('Starting Supabase...');
    execSync(`npx supabase start --workdir ${testConfigPath}`, {
      stdio: 'inherit',
      env: { ...process.env }
    });

    // Apply migrations to create the schema
    console.log('Applying database migrations...');
    execSync(`npx supabase db reset --workdir ${testConfigPath}`, {
      stdio: 'inherit',
      env: { ...process.env }
    });

    // Get Supabase credentials
    const supabaseStatus = execSync(`npx supabase status --workdir ${testConfigPath}`, { encoding: 'utf8' });
    const anonKeyMatch = supabaseStatus.match(/anon key: (.+)/);
    const serviceRoleKeyMatch = supabaseStatus.match(/service_role key: (.+)/);

    if (!anonKeyMatch || !serviceRoleKeyMatch) {
      throw new Error('Failed to get Supabase credentials');
    }

    const anonKey = anonKeyMatch[1].trim();
    const serviceRoleKey = serviceRoleKeyMatch[1].trim();

    // Start the Next.js app with test configuration
    console.log('Starting Next.js app...');
    const appEnv = {
      ...process.env,
      PORT: appPort,
      NEXT_PUBLIC_SUPABASE_URL: `http://localhost:54321`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      NODE_ENV: 'test'
    };

    appProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      env: appEnv
    });

    // Wait for Next.js to be ready
    await waitForService(`http://localhost:${appPort}`);

    // Install Playwright browsers if needed
    console.log('Ensuring Playwright browsers are installed...');
    execSync('npx playwright install chromium', { stdio: 'inherit' });

    // Run Playwright tests
    console.log('Running Playwright tests...');
    const testEnv = {
      ...process.env,
      BASE_URL: `http://localhost:${appPort}`,
      SUPABASE_URL: `http://localhost:54321`,
      SUPABASE_ANON_KEY: anonKey,
      E2E_REPORTS_DIR: reportsDir,
      E2E_PROJECT_ID: projectId
    };

    const testProcess = spawn('npx', ['playwright', 'test', '--reporter=html'], {
      stdio: 'inherit',
      env: testEnv
    });

    await new Promise((resolve, reject) => {
      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Tests completed successfully');
        } else {
          console.log(`Tests failed with code ${code}`);
        }
        
        // Move Playwright HTML report to our reports directory
        try {
          const defaultReportPath = path.join(__dirname, '..', 'playwright-report');
          const targetReportPath = path.join(reportsDir, 'playwright-report');
          
          if (fs.existsSync(defaultReportPath)) {
            fs.cpSync(defaultReportPath, targetReportPath, { recursive: true });
            fs.rmSync(defaultReportPath, { recursive: true, force: true });
            console.log(`Test report saved to: ${targetReportPath}`);
          }
        } catch (err) {
          console.warn('Failed to move test report:', err.message);
        }
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tests failed with code ${code}`));
        }
      });
    });

  } finally {
    // Cleanup
    console.log('Cleaning up...');

    if (appProcess) {
      appProcess.kill('SIGTERM');
    }

    // Stop Supabase
    execSync(`npx supabase stop --workdir ${testConfigPath}`, { stdio: 'inherit' });

    // Delete supabase folder after test run
    fs.rmSync(testConfigPath, { recursive: true, force: true });

    console.log(`Test artifacts preserved in: ${testRunDir}`);
    console.log(`- Test reports: ${reportsDir}`);
  }
}

main().catch(error => {
  console.error('E2E test failed:', error);
  process.exit(1);
});
