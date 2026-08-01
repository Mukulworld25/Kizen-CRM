import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const artifactDir = 'C:/Users/admin/.gemini/antigravity/brain/738305c6-cdda-40ee-a723-7d8ae6c7280a/.user_uploaded';

if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("Launching browser via Puppeteer...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();
  
  try {
    console.log("Navigating to login page...");
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0', timeout: 30000 });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log("Typing login credentials with Puppeteer page.type()...");
    await page.type('input[type="email"]', 'shivam.kizen.test@gmail.com');
    await page.type('input[type="password"]', 'Shivam@123');
    
    console.log("Submitting login form...");
    await page.click('button[type="submit"]');
    await delay(3000);
    console.log("Current page URL after login submit:", page.url());
    
    // ----------------------------------------------------
    // 1. FEES TABLE ACTIONS VERIFICATION
    // ----------------------------------------------------
    console.log("Navigating to Fees page...");
    await page.goto('http://127.0.0.1:5173/fees', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2500);
    
    const feesHeaders = await page.evaluate(() => 
      Array.from(document.querySelectorAll('th')).map(th => th.textContent?.trim()).filter(Boolean)
    );
    console.log("Fees Table Headers:", feesHeaders);
    
    const feesScreenshotPath = path.join(artifactDir, 'fees_table_actions_verified.png');
    await page.screenshot({ path: feesScreenshotPath });
    console.log(`Saved Fees table screenshot to: ${feesScreenshotPath}`);

    // Open Edit Fee Modal
    const editFeeBtn = await page.$('button[title="Edit Fee Structure"]');
    if (editFeeBtn) {
      console.log("Clicking Edit Fee button...");
      await editFeeBtn.click();
      await delay(1000);
      const feeEditModalPath = path.join(artifactDir, 'fee_edit_modal_verified.png');
      await page.screenshot({ path: feeEditModalPath });
      console.log(`Saved Fee Edit Modal screenshot to: ${feeEditModalPath}`);
      await page.keyboard.press('Escape');
      await delay(500);
    }
    
    // ----------------------------------------------------
    // 2. STUDENTS TABLE ACTIONS VERIFICATION
    // ----------------------------------------------------
    console.log("Navigating to Students page...");
    await page.goto('http://127.0.0.1:5173/students', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2500);
    
    const studentsHeaders = await page.evaluate(() => 
      Array.from(document.querySelectorAll('th')).map(th => th.textContent?.trim()).filter(Boolean)
    );
    console.log("Students Table Headers:", studentsHeaders);
    
    const studentsScreenshotPath = path.join(artifactDir, 'students_table_actions_verified.png');
    await page.screenshot({ path: studentsScreenshotPath });
    console.log(`Saved Students table screenshot to: ${studentsScreenshotPath}`);

    // ----------------------------------------------------
    // 3. BATCHES TABLE ACTIONS VERIFICATION
    // ----------------------------------------------------
    console.log("Navigating to Batches page...");
    await page.goto('http://127.0.0.1:5173/batches', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2500);
    
    const batchesHeaders = await page.evaluate(() => 
      Array.from(document.querySelectorAll('th')).map(th => th.textContent?.trim()).filter(Boolean)
    );
    console.log("Batches Table Headers:", batchesHeaders);
    
    const batchesScreenshotPath = path.join(artifactDir, 'batches_table_actions_verified.png');
    await page.screenshot({ path: batchesScreenshotPath });
    console.log(`Saved Batches table screenshot to: ${batchesScreenshotPath}`);

    console.log("Table actions verification completed cleanly with 0 errors!");
  } catch (err) {
    console.error("Puppeteer execution error:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
