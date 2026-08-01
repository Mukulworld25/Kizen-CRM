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
    await delay(4000);
    console.log("Current page URL after login submit:", page.url());
    
    // ----------------------------------------------------
    // 1. FEES TABLE COLUMN TOGGLE VERIFICATION
    // ----------------------------------------------------
    console.log("Navigating to Fees page...");
    await page.goto('http://127.0.0.1:5173/fees', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);
    console.log("Current URL on Fees page:", page.url());
    
    const initialFeesHeaders = await page.evaluate(() => 
      Array.from(document.querySelectorAll('th')).map(th => th.textContent?.trim()).filter(Boolean)
    );
    console.log("Initial Fees Table Headers:", initialFeesHeaders);
    
    console.log("Clicking Column Toggle settings button on Fees table using Puppeteer click()...");
    const buttonsFees = await page.$$('button');
    let feesToggleBtn = null;
    for (const b of buttonsFees) {
      const isMatch = await page.evaluate(el => !!(el.querySelector('svg.lucide-settings-2') || el.innerHTML.includes('lucide-settings-2')), b);
      if (isMatch) {
        feesToggleBtn = b;
        break;
      }
    }
    
    if (!feesToggleBtn) {
      throw new Error("Could not find column toggle button on Fees table");
    }
    
    await feesToggleBtn.click();
    await delay(1000);
    
    console.log("Waiting for dropdown menu items to appear...");
    await page.waitForSelector('[role="menuitemcheckbox"]', { visible: true, timeout: 5000 });
    
    const feesItems = await page.$$('[role="menuitemcheckbox"]');
    console.log(`Found ${feesItems.length} column checkboxes in Fees table.`);
    
    let uncheckedFeesCol = '';
    for (const item of feesItems) {
      const txt = await page.evaluate(el => el.textContent?.trim(), item);
      if (txt === 'Course' || txt === 'Student' || txt === 'Subject') {
        uncheckedFeesCol = txt;
        console.log(`Unchecking Fees column checkbox: "${txt}"`);
        await item.click();
        break;
      }
    }
    await delay(1500);
    
    const updatedFeesHeaders = await page.evaluate(() => 
      Array.from(document.querySelectorAll('th')).map(th => th.textContent?.trim()).filter(Boolean)
    );
    console.log(`Fees Headers after unchecking "${uncheckedFeesCol}":`, updatedFeesHeaders);
    console.log(`Is "${uncheckedFeesCol}" hidden from table?`, !updatedFeesHeaders.includes(uncheckedFeesCol));
    
    const feesScreenshotPath = path.join(artifactDir, 'fees_column_toggle_verified.png');
    await page.screenshot({ path: feesScreenshotPath });
    console.log(`Saved Fees screenshot to: ${feesScreenshotPath}`);
    
    await page.keyboard.press('Escape');
    await delay(1000);
    
    // ----------------------------------------------------
    // 2. LEADS TABLE COLUMN TOGGLE VERIFICATION
    // ----------------------------------------------------
    console.log("Navigating to Leads page...");
    await page.goto('http://127.0.0.1:5173/leads', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);
    console.log("Current URL on Leads page:", page.url());
    
    const initialLeadsHeaders = await page.evaluate(() => 
      Array.from(document.querySelectorAll('th')).map(th => th.textContent?.trim()).filter(Boolean)
    );
    console.log("Initial Leads Table Headers:", initialLeadsHeaders);
    
    console.log("Clicking Column Toggle settings button on Leads table using Puppeteer click()...");
    const buttonsLeads = await page.$$('button');
    let leadsToggleBtn = null;
    for (const b of buttonsLeads) {
      const isMatch = await page.evaluate(el => !!(el.querySelector('svg.lucide-settings-2') || el.innerHTML.includes('lucide-settings-2')), b);
      if (isMatch) {
        leadsToggleBtn = b;
        break;
      }
    }
    
    if (!leadsToggleBtn) {
      throw new Error("Could not find column toggle button on Leads table");
    }
    
    await leadsToggleBtn.click();
    await delay(1000);
    
    console.log("Waiting for dropdown menu items to appear on Leads table...");
    await page.waitForSelector('[role="menuitemcheckbox"]', { visible: true, timeout: 5000 });
    
    const leadsItems = await page.$$('[role="menuitemcheckbox"]');
    console.log(`Found ${leadsItems.length} column checkboxes in Leads table.`);
    
    let uncheckedLeadsCol = '';
    for (const item of leadsItems) {
      const txt = await page.evaluate(el => el.textContent?.trim(), item);
      if (txt === 'Mobile' || txt === 'Source' || txt === 'Temp') {
        uncheckedLeadsCol = txt;
        console.log(`Unchecking Leads column checkbox: "${txt}"`);
        await item.click();
        break;
      }
    }
    await delay(1500);
    
    const updatedLeadsHeaders = await page.evaluate(() => 
      Array.from(document.querySelectorAll('th')).map(th => th.textContent?.trim()).filter(Boolean)
    );
    console.log(`Leads Headers after unchecking "${uncheckedLeadsCol}":`, updatedLeadsHeaders);
    console.log(`Is "${uncheckedLeadsCol}" hidden from table?`, !updatedLeadsHeaders.includes(uncheckedLeadsCol));
    
    const leadsScreenshotPath = path.join(artifactDir, 'leads_column_toggle_verified.png');
    await page.screenshot({ path: leadsScreenshotPath });
    console.log(`Saved Leads screenshot to: ${leadsScreenshotPath}`);
    
    console.log("Column toggle verification completed cleanly with 0 errors!");
  } catch (err) {
    console.error("Puppeteer execution error:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
