import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const artifactDir = 'C:/Users/admin/.gemini/antigravity/brain/738305c6-cdda-40ee-a723-7d8ae6c7280a/.user_uploaded';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testUser(email, password, roleName) {
  console.log(`\n=== Testing Faculty Tab Visibility for ${roleName} (${email}) ===`);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await delay(4000);
    console.log(`LoggedIn URL for ${roleName}:`, page.url());

    // Check if sidebar contains Faculty & Study Materials
    const navText = await page.evaluate(() => document.body.innerText);
    const hasFacultyTab = navText.includes('Faculty & Study Materials');
    console.log(`Is "Faculty & Study Materials" visible in Sidebar for ${roleName}?`, hasFacultyTab);

    // Save screenshot to D: drive workspace
    const dPath = path.join('d:/CRM CURSOR/kizen-crm', `${roleName}_faculty_tab_verified.png`);
    await page.screenshot({ path: dPath });
    console.log(`Saved screenshot to D: drive: ${dPath}`);

    // Try copying to artifact dir
    try {
      if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
      const cPath = path.join(artifactDir, `${roleName}_faculty_tab_verified.png`);
      fs.copyFileSync(dPath, cPath);
      console.log(`Copied screenshot to artifact dir: ${cPath}`);
    } catch (e) {
      console.log(`Artifact copy note: ${e.message}`);
    }

    // Click on Faculty link & check route
    await page.goto('http://127.0.0.1:5173/faculty', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);
    console.log(`Page URL after navigating to /faculty for ${roleName}:`, page.url());
    
    const dPagePath = path.join('d:/CRM CURSOR/kizen-crm', `${roleName}_faculty_page_verified.png`);
    await page.screenshot({ path: dPagePath });
    console.log(`Saved page screenshot to D: drive: ${dPagePath}`);

    try {
      const cPagePath = path.join(artifactDir, `${roleName}_faculty_page_verified.png`);
      fs.copyFileSync(dPagePath, cPagePath);
      console.log(`Copied page screenshot to artifact dir: ${cPagePath}`);
    } catch (e) {
      console.log(`Artifact copy note: ${e.message}`);
    }

  } catch (err) {
    console.error(`Error testing ${roleName}:`, err);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testUser('counselor1@kizen.edu', 'Shivam@123', 'counselor');
  await testUser('reception@kizen.edu', 'Shivam@123', 'reception');
  console.log("\nFaculty Tab Visibility Verification Complete!");
}

run();
