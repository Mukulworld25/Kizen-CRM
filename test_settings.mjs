import puppeteer from 'puppeteer-core';

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: "new",
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  // Login as admin
  console.log("Logging in as admin...");
  await page.goto('http://127.0.0.1:5173/login');
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@kizen.edu');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  await delay(5000);
  
  // Go to settings
  console.log("Going to settings...");
  await page.goto('http://127.0.0.1:5173/settings');
  await delay(3000);
  
  console.log("Toggling batches off for reception...");
  await page.evaluate(() => {
    const roleTab = document.querySelector('button[value="role_permissions"]');
    if (roleTab) roleTab.click();
  });
  await delay(2000);

  const clicked = await page.evaluate(async () => {
    const switches = Array.from(document.querySelectorAll('button[title="Toggle View Access for Batches"]'));
    if (switches.length >= 3) {
      // 0 = Owner, 1 = Admin, 2 = Reception
      switches[2].click();
      return true;
    }
    return false;
  });
  
  if (clicked) {
    console.log("Clicked to turn off Batches for reception");
    await delay(3000);
  } else {
    console.log("Failed to find switch");
  }

  // Logout
  await page.evaluate(() => {
    const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Log out') || b.textContent.includes('Logout'));
    if (logoutBtn) logoutBtn.click();
  });
  await delay(3000);

  // Login as reception
  console.log("Logging in as reception...");
  await page.goto('http://127.0.0.1:5173/login');
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'reception@kizen.edu');
  await page.type('input[type="password"]', 'reception123');
  await page.click('button[type="submit"]');
  
  await delay(5000);
  
  // Check sidebar for Batches
  const hasBatches = await page.evaluate(() => {
    return !!Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Batches'));
  });
  
  console.log("Batches tab visible when OFF?", hasBatches);

  // Logout
  await page.evaluate(() => {
    const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Log out') || b.textContent.includes('Logout'));
    if (logoutBtn) logoutBtn.click();
  });
  await delay(3000);

  // Login as admin again
  console.log("Logging in as admin again...");
  await page.goto('http://127.0.0.1:5173/login');
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@kizen.edu');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  await delay(5000);

  // Go to settings
  console.log("Going to settings...");
  await page.goto('http://127.0.0.1:5173/settings');
  await delay(3000);

  await page.evaluate(() => {
    const roleTab = document.querySelector('button[value="role_permissions"]');
    if (roleTab) roleTab.click();
  });
  await delay(2000);

  console.log("Toggling batches back on for reception...");
  await page.evaluate(async () => {
    const switches = Array.from(document.querySelectorAll('button[title="Toggle View Access for Batches"]'));
    if (switches.length >= 3) {
      switches[2].click();
    }
  });
  await delay(3000);
  
  await browser.close();
  console.log("Done");
}

run().catch(console.error);
