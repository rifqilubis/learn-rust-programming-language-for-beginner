import puppeteer from "puppeteer";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const base = process.argv[2] || "http://localhost:8123";

const pages = [
  "/index.html",
  "/lessons.html",
  "/playground.html",
  "/lesson-01-install-and-first-program.html",
  "/lesson-06-ownership.html",
  "/lesson-12-modules-and-tests.html",
];

const browser = await puppeteer.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

let total = 0;

for (const theme of ["dark", "light"]) {
  for (const path of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(base + path, { waitUntil: "networkidle2" });
    await page.evaluate((value) => localStorage.setItem("rustlearn.theme", value), theme);
    await page.reload({ waitUntil: "networkidle2" });

    /* The tips and solution are closed by default. Open them so axe checks
       the panels a stuck reader actually sees, not just the summary row. */
    if (path.startsWith("/lesson-")) {
      await page.evaluate(() => {
        document.querySelectorAll("[data-ex-help]").forEach((details) => {
          details.open = true;
        });
      });
    }

    await page.evaluate(axeSource);
    const result = await page.evaluate(async () => {
      const report = await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      });
      return report.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
        count: violation.nodes.length,
      }));
    });
    total += result.length;
    const label = `${theme.padEnd(5)} ${path}`;
    if (result.length === 0) {
      console.log(`ok    ${label}`);
    } else {
      console.log(`FAIL  ${label}`);
      for (const violation of result) {
        console.log(`        ${violation.id} (${violation.impact}, ${violation.count}): ${violation.help}`);
        for (const node of violation.nodes) console.log(`          ${node}`);
      }
    }
    await page.close();
  }
}

await browser.close();
console.log(`\n${total === 0 ? "PASS" : "FAIL"}: ${pages.length * 2} page/theme combinations, ${total} violations`);
process.exit(total === 0 ? 0 : 1);
