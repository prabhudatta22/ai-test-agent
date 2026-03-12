const { chromium } = require('playwright');
const fs = require('fs-extra');

const BASE_URL = "https://forms1.qa.darwinbox.io/ms/vibe/home/posts/all";
const USERNAME = "FB001";
const PASSWORD = "Test.123";

const MAX_DEPTH = 10;

const visited = new Set();
const results = [];

async function extractControls(page, url) {

    const controls = await page.evaluate(() => {

        const elements = document.querySelectorAll(
            'button, input, select, textarea, a, [role], [onclick], data-testid'
        );

        const data = [];

        elements.forEach(el => {

            const getSelector = (element) => {
                if (element.id) return `#${element.id}`;

                const path = [];
                while (element.parentElement) {
                    let selector = element.tagName.toLowerCase();

                    if (element.className)
                        selector += "." + element.className.split(" ").join(".");

                    path.unshift(selector);
                    element = element.parentElement;
                }

                return path.join(" > ");
            };

            data.push({
                tag: el.tagName.toLowerCase(),
                id: el.id || el.getAttribute("data-testid") || null,
                role: el.getAttribute("role"),
                name: el.getAttribute("name"),
                type: el.getAttribute("type"),
                text: el.innerText?.trim(),
                ariaLabel: el.getAttribute("aria-label"),
                placeholder: el.getAttribute("placeholder"),
                selector: getSelector(el)
            });

        });

        return data;
    });

    results.push({
        page: url,
        controls
    });
}

async function crawl(page, depth = 0) {

    if (depth > MAX_DEPTH) {
        console.log("Max depth reached:", depth);
        return;
    }

    const url = page.url();

    if (visited.has(url)) return;
    visited.add(url);

    console.log(`Scanning depth ${depth}:`, url);

    await extractControls(page, url);

    const links = await page.$$eval("a[href]", links =>
        links.map(a => a.href)
    );

    for (const link of links) {

        if (!link.startsWith(BASE_URL)) continue;
        if (visited.has(link)) continue;

        try {

            await page.goto(link, { waitUntil: "networkidle" });

            await crawl(page, depth + 1);

        } catch (err) {

            console.log("Navigation failed:", link);

        }
    }
}

(async () => {

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log("Opening login page...");

    await page.goto(BASE_URL);

    // LOGIN
   
      await page.fill('#UserLogin_username', USERNAME);
        await page.fill('#UserLogin_password', PASSWORD);
        await page.click('[name="login-submit"]');
        await page.waitForTimeout(3000);

    await page.waitForLoadState("networkidle");

    console.log("Login successful");

    await crawl(page, 0);

    await fs.writeJSON("ui-controls.json", results, { spaces: 2 });

    console.log("Saved UI controls to ui-controls.json");

    await browser.close();

})();