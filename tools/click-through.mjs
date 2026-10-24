/**
 * Clicks through the site in a real browser and reports what happened, so the
 * delivery claim is evidence rather than assertion. Run it against a served
 * copy of the site:
 *
 *   python3 -m http.server 8123 &
 *   node tools/click-through.mjs http://localhost:8123
 *
 * Requires puppeteer-core and a Chrome binary. It is a development tool, not
 * part of the site.
 */

import puppeteer from "/tmp/verify/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";

const base = process.argv[2] || "http://localhost:8123";
const results = [];
const consoleErrors = [];

function record(step, detail) {
  results.push({ step, detail });
  console.log(`  ${step}: ${detail}`);
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error)));

async function goto(path) {
  const response = await page.goto(base + path, { waitUntil: "networkidle2" });
  return response.status();
}

console.log("\n== home ==");
record("GET /", String(await goto("/index.html")));

/* theme toggle */
const themeBefore = await page.evaluate(() => document.documentElement.dataset.theme);
await page.click(".site-nav [data-theme-toggle]");
await page.waitForFunction((before) => document.documentElement.dataset.theme !== before, {}, themeBefore);
const themeAfter = await page.evaluate(() => document.documentElement.dataset.theme);
record("theme toggle", `${themeBefore} -> ${themeAfter}`);

const storedTheme = await page.evaluate(() => localStorage.getItem("rustlearn.theme"));
record("theme persisted", String(storedTheme));

/* hero bench */
await page.click("[data-bench-run]");
await page.waitForFunction(
  () => {
    const out = document.querySelector("[data-bench-out]");
    const state = out && out.querySelector("[data-state]");
    return out && !out.hidden && state && state.textContent.trim() !== "" && state.textContent.trim() !== "compiling";
  },
  { timeout: 45000 },
);
const benchState = await page.$eval("[data-bench-out] [data-state]", (el) => el.textContent);
const benchOut = await page.$eval("[data-bench-out] [data-out]", (el) => el.textContent.trim());
record("hero run", `state="${benchState}" stdout="${benchOut}"`);

/* copy button */
await page.evaluate(() => {
  const button = document.querySelector("[data-copy-text]");
  button.click();
});
await new Promise((resolve) => setTimeout(resolve, 300));
const copyLabel = await page.$eval("[data-copy-text]", (el) => el.textContent.trim());
record("copy command", `button now reads "${copyLabel}"`);

/* progress after passing the exercise, then completing the lesson */
console.log("\n== lesson 02 ==");
record("GET lesson 02", String(await goto("/lesson-02-variables-and-mutability.html")));

const gateStart = await page.evaluate(() => {
  const gate = document.querySelector("[data-next-gate]");
  const next = document.querySelector("[data-next]");
  return {
    gateOpen: gate.dataset.open,
    nextVisible: next.getClientRects().length > 0,
    lockedVisible: document.querySelector("[data-next-locked]").getClientRects().length > 0,
    completeDisabled: document.querySelector("[data-complete]").disabled,
  };
});
record(
  "gate starts closed",
  `data-open=${gateStart.gateOpen} next visible=${gateStart.nextVisible} locked button visible=${gateStart.lockedVisible} complete disabled=${gateStart.completeDisabled}`,
);

async function answer(code) {
  await page.evaluate((source) => {
    const textarea = document.querySelector("[data-ex-source]");
    textarea.value = source;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }, code);
  await page.click("[data-ex-check]");
  await page.waitForFunction(
    () => {
      const verdict = document.querySelector("[data-ex-verdict]");
      const state = document.querySelector("[data-ex-state]");
      return verdict.textContent.trim() !== "" && state.textContent.trim() !== "compiling";
    },
    { timeout: 60000 },
  );
  return page.evaluate(() => ({
    verdict: document.querySelector("[data-ex-verdict]").textContent.trim(),
    tone: document.querySelector("[data-ex-verdict]").dataset.tone,
    state: document.querySelector("[data-ex-state]").textContent.trim(),
    passed: document.querySelector("[data-exercise]").dataset.passed,
  }));
}

const wrong = await answer('fn main() {\n    println!("nope");\n}');
record("wrong answer", `state="${wrong.state}" passed=${wrong.passed} verdict="${wrong.verdict}"`);

const stillShut = await page.evaluate(
  () => document.querySelector("[data-next-gate]").dataset.open === "false" && document.querySelector("[data-complete]").disabled,
);
record("gate still closed after a wrong answer", String(stillShut));

const right = await answer(`fn main() {
    let price = 12.5;
    let quantity = 4;

    let total = price * quantity as f64;
    println!("total: {total:.2}");

    let price = price * 0.9;
    let discounted = price * quantity as f64;
    println!("discounted: {discounted:.2}");
}`);
record("right answer", `state="${right.state}" passed=${right.passed} verdict="${right.verdict}"`);

const unlocked = await page.evaluate(() => ({
  gateOpen: document.querySelector("[data-next-gate]").dataset.open,
  nextVisible: document.querySelector("[data-next]").getClientRects().length > 0,
  completeDisabled: document.querySelector("[data-complete]").disabled,
}));
record(
  "gate opens after a pass",
  `data-open=${unlocked.gateOpen} next visible=${unlocked.nextVisible} complete enabled=${!unlocked.completeDisabled}`,
);

const storedExercises = await page.evaluate(() => localStorage.getItem("rustlearn.exercises"));
record("pass persisted", String(storedExercises));

await page.click("[data-complete]");
await page.waitForFunction(() => document.querySelector("[data-complete]").getAttribute("aria-pressed") === "true");
const stored = await page.evaluate(() => localStorage.getItem("rustlearn.progress"));
record("mark complete", `stored ${stored}`);

await goto("/lesson-02-variables-and-mutability.html");
const afterReload = await page.evaluate(() => ({
  passed: document.querySelector("[data-exercise]").dataset.passed,
  gateOpen: document.querySelector("[data-next-gate]").dataset.open,
}));
record("gate survives reload", `exercise passed=${afterReload.passed} gate data-open=${afterReload.gateOpen}`);

/* run a sample inside the lesson */
const runButtons = await page.$$("[data-run]");
record("runnable samples on page", String(runButtons.length));
await runButtons[0].click();
await page.waitForFunction(
  () => {
    const state = document.querySelector(".code__out:not([hidden]) [data-state]");
    return state && state.textContent.trim() !== "" && state.textContent.trim() !== "compiling";
  },
  { timeout: 45000 },
);
const sampleState = await page.$eval(".code__out:not([hidden]) [data-state]", (el) => el.textContent);
const sampleOut = await page.$eval(".code__out:not([hidden]) [data-out]", (el) => el.textContent.trim());
record("lesson sample run", `state="${sampleState}" stdout="${sampleOut.split("\n")[0]}"`);

/* a sample the page says does not compile */
const failing = await page.$$('figure:not([data-runner]) .code__label');
record("non-runnable samples", String(failing.length));

/* toc links resolve */
const tocHrefs = await page.$$eval(".toc a", (links) => links.map((link) => link.getAttribute("href")));
const missingAnchors = await page.evaluate(
  (hrefs) => hrefs.filter((href) => !document.querySelector(href)),
  tocHrefs,
);
record("toc anchors", `${tocHrefs.length} links, ${missingAnchors.length} broken`);

/* every internal link resolves */
const linkProblems = await page.evaluate(async () => {
  const links = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
  const internal = links.filter((href) => !/^(https?:|mailto:|#)/.test(href));
  const unique = [...new Set(internal)];
  const bad = [];
  for (const href of unique) {
    const response = await fetch(href, { method: "HEAD" }).catch(() => null);
    if (!response || !response.ok) bad.push(href);
  }
  return { checked: unique.length, bad };
});
record("internal links", `${linkProblems.checked} checked, ${linkProblems.bad.length} broken`);

/* progress shows on the home page */
console.log("\n== home again ==");
await goto("/index.html");
const progressLabel = await page.$eval("[data-progress-label]", (el) => el.textContent.trim());
const rowState = await page.$eval('[data-lesson-row="variables-and-mutability"] [data-state-for]', (el) => el.textContent.trim());
record("progress after one lesson", `${progressLabel}, lesson 02 state="${rowState}"`);

/* playground page */
console.log("\n== playground ==");
record("GET playground", String(await goto("/playground.html")));
await page.select("[data-pg-edition]", "2021");
await page.click("[data-pg-run]");
await page.waitForFunction(
  () => {
    const state = document.querySelector("[data-state]");
    return state && state.textContent.trim() !== "" && state.textContent.trim() !== "compiling";
  },
  { timeout: 45000 },
);
const pgState = await page.$eval("[data-state]", (el) => el.textContent);
const pgOut = await page.$eval("[data-out]", (el) => el.textContent.trim());
record("playground run", `state="${pgState}" stdout="${pgOut.split("\n").join(" / ")}"`);

await page.click("[data-pg-clear]");
const clearedOut = await page.$eval("[data-out]", (el) => el.textContent.trim());
record("clear output", `output is now "${clearedOut}" (empty means cleared)`);

/* mobile viewport: menu, overflow, tap targets */
console.log("\n== mobile 390x844 ==");
await page.setViewport({ width: 390, height: 844 });
await goto("/index.html");

const overflow = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
record("horizontal overflow", `scrollWidth ${overflow.scrollWidth} vs clientWidth ${overflow.clientWidth}`);

await page.click("[data-nav-toggle]");
await page.waitForFunction(() => document.querySelector("[data-nav-panel]").dataset.open === "true");
record("menu opens", "panel data-open=true");
await page.keyboard.press("Escape");
await page.waitForFunction(() => document.querySelector("[data-nav-panel]").dataset.open === "false");
record("menu closes on Escape", "panel data-open=false");

const smallTargets = await page.evaluate(() => {
  /* Inline links inside running text are exempt from the 44px target rule in
     WCAG 2.2 (the inline exception). Everything that stands on its own is not. */
  const inlineExceptions = ".prose p a, .site-foot__note a, .hero__note a, .setup__lede a, .muted-p a, .callout a";
  const nodes = [...document.querySelectorAll("a[href], button")];
  return nodes
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      if (node.closest(".skip")) return false;
      if (node.matches(inlineExceptions)) return false;
      if (getComputedStyle(node).display === "none") return false;
      return (
        rect.height < 44 &&
        node.closest(".site-head, .ledger, .hero__actions, .lesson-foot, .site-foot, .toc, .pg, .exercise, .lesson-foot__nav")
      );
    })
    .map((node) => `${node.tagName.toLowerCase()}:${(node.textContent || "").trim().slice(0, 24)} ${Math.round(node.getBoundingClientRect().height)}px`);
});
record("tap targets under 44px", smallTargets.length === 0 ? "none" : smallTargets.join(", "));

/* the exercise editor must not trap the keyboard */
await goto("/lesson-04-functions.html");
await page.focus("[data-ex-source]");
await page.keyboard.press("Escape");
await page.keyboard.press("Tab");
const afterTab = await page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el.tagName, insideEditor: Boolean(el.closest(".exercise__bench")) };
});
record("Escape then Tab leaves the editor", `${afterTab.tag} inside bench=${afterTab.insideEditor}`);

/* with JavaScript off, the course still navigates */
await page.setJavaScriptEnabled(false);
await goto("/lesson-04-functions.html");
const noJs = await page.evaluate(() => {
  const next = document.querySelector("[data-next]");
  const locked = document.querySelector("[data-next-locked]");
  return {
    nextVisible: next.getClientRects().length > 0,
    lockedVisible: locked.getClientRects().length > 0,
  };
});
record("no-JS fallback", `next link visible=${noJs.nextVisible} locked button visible=${noJs.lockedVisible}`);
await page.setJavaScriptEnabled(true);

/* keyboard: the first Tab stop is the skip link and it must show a ring */
await page.setViewport({ width: 1280, height: 900 });
await goto("/index.html");
await page.keyboard.press("Tab");
await new Promise((resolve) => setTimeout(resolve, 250));
const focusInfo = await page.evaluate(() => {
  const el = document.activeElement;
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    text: (el.textContent || "").trim().slice(0, 30),
    outline: `${style.outlineWidth} ${style.outlineStyle} ${style.outlineColor}`,
    visible: rect.top >= 0 && rect.bottom <= window.innerHeight,
  };
});
record("first Tab stop", `"${focusInfo.text}" outline=${focusInfo.outline} visible=${focusInfo.visible}`);

/* tab order reaches the theme button, and Enter activates it */
const order = [];
for (let i = 0; i < 6; i += 1) {
  await page.keyboard.press("Tab");
  order.push(
    await page.evaluate(() => {
      const el = document.activeElement;
      return (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 22);
    }),
  );
}
record("tab order", order.join(" > "));

/* light theme: set it, reload, and confirm the attribute and the paint */
await page.evaluate(() => localStorage.setItem("rustlearn.theme", "light"));
await goto("/lesson-06-ownership.html");
const light = await page.evaluate(() => ({
  attr: document.documentElement.dataset.theme,
  bg: getComputedStyle(document.body).backgroundColor,
  text: getComputedStyle(document.body).color,
}));
record("light theme after reload", `attr=${light.attr} bg=${light.bg} text=${light.text}`);

/* every page returns 200 */
const pages = await page.evaluate(async () => {
  const links = [...new Set([...document.querySelectorAll('a[href$=".html"]')].map((a) => a.getAttribute("href")))];
  const out = [];
  for (const href of links) {
    const response = await fetch(href, { method: "HEAD" });
    out.push(`${href}:${response.status}`);
  }
  return out;
});
const badPages = pages.filter((entry) => !entry.endsWith(":200"));
record("all pages", `${pages.length} linked pages, ${badPages.length} not 200`);

await browser.close();

console.log("\n== console ==");
record("console errors", consoleErrors.length === 0 ? "none" : consoleErrors.join(" | "));

console.log("\nsummary");
const problems = results.filter(
  (item) =>
    /\b[1-9]\d* broken/.test(item.detail) ||
    /\b[1-9]\d* not 200/.test(item.detail) ||
    (item.step === "horizontal overflow" && !item.detail.startsWith("scrollWidth 390")) ||
    (item.step === "console errors" && item.detail !== "none") ||
    (item.step === "tap targets under 44px" && item.detail !== "none") ||
    (item.step === "light theme after reload" && !item.detail.includes("attr=light")),
);
console.log(`  ${results.length} checks, ${problems.length} with a problem`);
for (const problem of problems) console.log(`  PROBLEM ${problem.step}: ${problem.detail}`);

process.exit(problems.length === 0 ? 0 : 1);
