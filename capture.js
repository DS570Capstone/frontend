const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to landing page...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: './assets/screenshots/landing_page.png' });
    console.log('Saved landing_page.png');

    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: './assets/screenshots/dashboard.png' });
    console.log('Saved dashboard.png');

    await browser.close();
    console.log('Screenshots complete.');
})();
