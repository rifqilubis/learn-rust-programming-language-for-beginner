/**
 * Clicks through the site in a real browser and reports what happened, so the
 * delivery claim is evidence rather than assertion. Run it against a served
 * copy of the site:
 *
 *   python3 -m http.server 8123 &
 *   node tools/click-through.mjs http://localhost:8123
 *
 * Requires the `puppeteer` dev dependency. It is a development tool, not part
 * of the site.
 */

import puppeteer from "puppeteer";

const base = process.argv[2] || "http://localhost:8123";
const results = [];
const consoleErrors = [];

function record(step, detail) {
  results.push({ step, detail });
  console.log(`  ${step}: ${detail}`);
}

const browser = await puppeteer.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  headless: true,
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

/* Lesson 1 is output-only, so it has the most obvious cheat: type the answer.
   The page rejects the plain line, a dead two-slot call, a split line, and a
   slot call that only runs under `cargo test`. The real formatted line passes
   and opens the gate. */
console.log("\n== lesson 01 ==");
record("GET lesson 01", String(await goto("/lesson-01-install-and-first-program.html")));

const plainOutput = await answer(
  'fn main() {\n    println!("Hello from Rust!");\n    println!("Learning Rust in 2026");\n}',
);
record(
  "plain output",
  `state="${plainOutput.state}" passed=${plainOutput.passed} verdict="${plainOutput.verdict}"`,
);

const deadSlot = await answer(
  'fn main() {\n    println!("Hello from Rust!");\n    println!("Learning Rust in 2026");\n    if false {\n        println!("Learning {} in {}", "Rust", 2026);\n    }\n}',
);
record(
  "plain output with a dead slot call",
  `state="${deadSlot.state}" passed=${deadSlot.passed} verdict="${deadSlot.verdict}"`,
);

const splitOutput = await answer(
  'fn main() {\n    println!("Hello from Rust!");\n    print!("Learning Rust in ");\n    println!("2026");\n    if false {\n        println!("Learning {} in {}", "Rust", 2026);\n    }\n}',
);
record(
  "split plain output with a dead slot call",
  `state="${splitOutput.state}" passed=${splitOutput.passed} verdict="${splitOutput.verdict}"`,
);

/* The slot call only runs under `cargo test`. The old check ran the slot line
   in the test harness, so this passed; the check now runs a normal program. */
const cfgTestSlot = await answer(
  'fn main() {\n    println!("Hello from Rust!");\n    print!("Learning Rust in ");\n    println!("2026");\n    if cfg!(test) {\n        println!("Learning {} in {}", "Rust", 2026);\n    }\n}',
);
record(
  "plain output with a cfg!(test) slot call",
  `state="${cfgTestSlot.state}" passed=${cfgTestSlot.passed} verdict="${cfgTestSlot.verdict}"`,
);

const misplacedSlot = await answer(
  'fn main() {\n    println!("{} {}", "Hello", "from Rust!");\n    print!("Learning Rust in ");\n    println!("2026");\n}',
);
record(
  "two-slot call on the first line",
  `state="${misplacedSlot.state}" passed=${misplacedSlot.passed} verdict="${misplacedSlot.verdict}"`,
);

const formatted = await answer(
  'fn main() {\n    println!("Hello from Rust!");\n    println!("Learning {} in {}", "Rust", 2026);\n}',
);
record(
  "formatted answer",
  `state="${formatted.state}" passed=${formatted.passed} verdict="${formatted.verdict}"`,
);

const lessonOneGate = await page.evaluate(() => {
  const gate = document.querySelector("[data-next-gate]");
  const next = document.querySelector("[data-next]");
  return { gateOpen: gate.dataset.open, nextVisible: next.getClientRects().length > 0 };
});
record("lesson 01 gate after passing", `data-open=${lessonOneGate.gateOpen} next visible=${lessonOneGate.nextVisible}`);

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

/* Help must be available before a reader ever gets a code working, and must
   never be the thing that opens the gate. A <details> starts closed; opening
   it should reveal the tips, change the label, and leave the exercise exactly
   as it was. */
const helpStart = await page.evaluate(() => {
  const details = [...document.querySelectorAll("[data-ex-help]")];
  const exercise = document.querySelector("[data-exercise]");
  return {
    count: details.length,
    tipsOpen: details.find((item) => item.dataset.exHelp === "tips")?.open,
    solutionOpen: details.find((item) => item.dataset.exHelp === "solution")?.open,
    passed: exercise.dataset.passed,
    gateOpen: document.querySelector("[data-next-gate]").dataset.open,
    completeDisabled: document.querySelector("[data-complete]").disabled,
  };
});
record(
  "help starts closed",
  `${helpStart.count} panels, tips open=${helpStart.tipsOpen} solution open=${helpStart.solutionOpen}, passed=${helpStart.passed}, gate=${helpStart.gateOpen}`,
);

await page.click('[data-ex-help="tips"] summary');
await page.waitForFunction(() => {
  const details = document.querySelector('[data-ex-help="tips"]');
  const hide = details.querySelector(".exercise__help-hide");
  return details.open && hide && getComputedStyle(hide).display !== "none";
});
const tipsOpen = await page.evaluate(() => {
  const details = document.querySelector('[data-ex-help="tips"]');
  const hide = details.querySelector(".exercise__help-hide");
  const exercise = document.querySelector("[data-exercise]");
  return {
    open: details.open,
    label: hide && getComputedStyle(hide).display !== "none" ? hide.textContent.trim() : "Show tips",
    tips: details.querySelectorAll(".exercise__tips-list li").length,
    hasShort: Boolean(details.querySelector(".exercise__tips-short")),
    passed: exercise.dataset.passed,
    gateOpen: document.querySelector("[data-next-gate]").dataset.open,
    completeDisabled: document.querySelector("[data-complete]").disabled,
  };
});
record(
  "tips open",
  `label="${tipsOpen.label}" ${tipsOpen.tips} tips, short version=${tipsOpen.hasShort}, passed=${tipsOpen.passed}, gate=${tipsOpen.gateOpen}`,
);

await page.click('[data-ex-help="tips"] summary');
await page.waitForFunction(() => {
  const details = document.querySelector('[data-ex-help="tips"]');
  const hide = details.querySelector(".exercise__help-hide");
  return !details.open && (!hide || getComputedStyle(hide).display === "none");
});
const tipsClosed = await page.evaluate(() => {
  const details = document.querySelector('[data-ex-help="tips"]');
  return details.querySelector(".exercise__help-show").textContent.trim();
});
record("tips close", `label="${tipsClosed}"`);

const editorBeforeSolution = await page.$eval("[data-ex-source]", (el) => el.value);
await page.click('[data-ex-help="solution"] summary');
await page.waitForFunction(() => {
  const details = document.querySelector('[data-ex-help="solution"]');
  const hide = details.querySelector(".exercise__help-hide");
  return details.open && hide && getComputedStyle(hide).display !== "none";
});
const solutionOpen = await page.evaluate(() => {
  const details = document.querySelector('[data-ex-help="solution"]');
  const exercise = document.querySelector("[data-exercise]");
  return {
    label: details.querySelector(".exercise__help-hide").textContent.trim(),
    code: details.querySelector("pre code").textContent.trim(),
    hasCopy: Boolean(details.querySelector("[data-ex-copy]")),
    hasFill: Boolean(details.querySelector("[data-ex-fill]")),
    passed: exercise.dataset.passed,
    gateOpen: document.querySelector("[data-next-gate]").dataset.open,
    completeDisabled: document.querySelector("[data-complete]").disabled,
    editor: document.querySelector("[data-ex-source]").value,
  };
});
record(
  "solution open",
  `label="${solutionOpen.label}" ${solutionOpen.code.split("\n").length} lines, copy=${solutionOpen.hasCopy}, load=${solutionOpen.hasFill}, passed=${solutionOpen.passed}, gate=${solutionOpen.gateOpen}, editor unchanged=${solutionOpen.editor === editorBeforeSolution}`,
);

await page.click("[data-ex-fill]");
await page.waitForFunction(
  (starterValue) => document.querySelector("[data-ex-source]").value !== starterValue,
  {},
  editorBeforeSolution,
);
const loaded = await page.evaluate(() => {
  const exercise = document.querySelector("[data-exercise]");
  return {
    editorMatchesSolution:
      document.querySelector("[data-ex-source]").value ===
      document.querySelector('[data-ex-help="solution"] pre code').textContent,
    passed: exercise.dataset.passed,
    gateOpen: document.querySelector("[data-next-gate]").dataset.open,
    completeDisabled: document.querySelector("[data-complete]").disabled,
    state: document.querySelector("[data-ex-state]").textContent.trim(),
    verdict: document.querySelector("[data-ex-verdict]").textContent.trim(),
  };
});
record(
  "loading the solution does not unlock",
  `editor matches=${loaded.editorMatchesSolution}, passed=${loaded.passed}, gate=${loaded.gateOpen}, complete disabled=${loaded.completeDisabled}, state="${loaded.state}"`,
);

/* Reset the editor so the rest of the flow still tests a reader solving it. */
await page.click("[data-ex-reset]");
await page.waitForFunction(
  (starterValue) => document.querySelector("[data-ex-source]").value === starterValue,
  {},
  editorBeforeSolution,
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

/* The reported cheat: print exactly the expected output, define nothing. */
const printed = await answer(`fn main() {
    println!("total: 50.00");
    println!("discounted: 45.00");
}`);
record("printing the expected output", `state="${printed.state}" passed=${printed.passed} verdict="${printed.verdict}"`);

/* Two failures should point the reader at the help without opening it for
   them. Opening the tips clears the nudge. */
const nudged = await page.evaluate(() =>
  document.querySelector('[data-ex-help="tips"] summary').getAttribute("data-nudge"),
);
record("tips nudged after two failures", String(nudged));
await page.click('[data-ex-help="tips"] summary');
await page.waitForFunction(() => document.querySelector('[data-ex-help="tips"]').open);
const nudgeCleared = await page
  .waitForFunction(
    () => !document.querySelector('[data-ex-help="tips"] summary').hasAttribute("data-nudge"),
    { timeout: 2000 },
  )
  .then(() => true)
  .catch(() => false);
record("opening tips clears the nudge", String(nudgeCleared));
await page.click('[data-ex-help="tips"] summary');
await page.waitForFunction(() => !document.querySelector('[data-ex-help="tips"]').open);

/* The next cheat: define the functions, but hard-code the example. */
const hardcoded = await answer(`fn main() {
    println!("total: 50.00");
    println!("discounted: 45.00");
}

fn total(_price: f64, _quantity: u32) -> f64 { 50.0 }
fn discounted(_price: f64, _quantity: u32) -> f64 { 45.0 }`);
record("hard-coded functions", `state="${hardcoded.state}" passed=${hardcoded.passed} verdict="${hardcoded.verdict}"`);

const right = await answer(`fn main() {
    let price = 12.5;
    let quantity = 4;

    println!("total: {:.2}", total(price, quantity));
    println!("discounted: {:.2}", discounted(price, quantity));
}

fn total(price: f64, quantity: u32) -> f64 {
    price * quantity as f64
}

fn discounted(price: f64, quantity: u32) -> f64 {
    let price = price * 0.9;
    price * quantity as f64
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

/* Help has to be tappable on a phone too, and its panels must not widen the
   page when they open. */
await goto("/lesson-02-variables-and-mutability.html");
const helpSizes = await page.evaluate(() => {
  const summaries = [...document.querySelectorAll("[data-ex-help] > summary")];
  return summaries.map((summary) => {
    const rect = summary.getBoundingClientRect();
    return `${summary.innerText.trim()} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
  });
});
record("help tap targets", helpSizes.join(", "));
await page.click('[data-ex-help="tips"] summary');
await page.click('[data-ex-help="solution"] summary');
const helpOverflow = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  panelWidth: document.querySelector('[data-ex-help="solution"] .exercise__panel').getBoundingClientRect().width,
  codeWidth: document.querySelector('[data-ex-help="solution"] pre').scrollWidth,
}));
record(
  "open help on mobile",
  `scrollWidth ${helpOverflow.scrollWidth} vs clientWidth ${helpOverflow.clientWidth}, solution code ${helpOverflow.codeWidth}px inside ${Math.round(helpOverflow.panelWidth)}px panel`,
);

/* The on-this-page links are standalone targets too, not inline links. */
const tocSizes = await page.$$eval(".toc a", (links) =>
  links.map((link) => Math.round(link.getBoundingClientRect().height)),
);
record(
  "toc tap targets",
  tocSizes.every((height) => height >= 44) ? "all at least 44px" : `${Math.min(...tocSizes)}px minimum`,
);

/* The tap-target scan below is about the home page; return to it now that the
   help checks have finished. */
await goto("/index.html");

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

/* Help is native <details>, so it has to open with JavaScript off too. */
const noJsHelp = await page.evaluate(() => {
  const details = document.querySelector('[data-ex-help="tips"]');
  return { exists: Boolean(details), open: details ? details.open : null };
});
record("no-JS help exists", `details=${noJsHelp.exists} starts open=${noJsHelp.open}`);
await page.click('[data-ex-help="tips"] summary');
const noJsHelpOpen = await page.evaluate(() => {
  const details = document.querySelector('[data-ex-help="tips"]');
  const hide = details.querySelector(".exercise__help-hide");
  return {
    open: details.open,
    tips: details.querySelectorAll(".exercise__tips-list li").length,
    label: hide && getComputedStyle(hide).display !== "none" ? hide.textContent.trim() : "Show tips",
  };
});
record(
  "no-JS help opens",
  `open=${noJsHelpOpen.open} ${noJsHelpOpen.tips} tips label="${noJsHelpOpen.label}"`,
);
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
    (item.step === "help tap targets" && /(^|, )\S.* (4[0-3]|[0-9]|[12][0-9]|3[0-9])px/.test(item.detail)) ||
    (item.step === "open help on mobile" && !item.detail.startsWith("scrollWidth 390")) ||
    (item.step === "toc tap targets" && item.detail !== "all at least 44px") ||
    (item.step === "tips nudged after two failures" && item.detail !== "true") ||
    (item.step === "opening tips clears the nudge" && item.detail !== "true") ||
    (item.step === "help starts closed" && !/tips open=false solution open=false, passed=false, gate=false/.test(item.detail)) ||
    (item.step === "tips open" && (!item.detail.includes('label="Hide tips"') || item.detail.includes("gate=true"))) ||
    (item.step === "tips close" && item.detail !== 'label="Show tips"') ||
    (item.step === "solution open" && (!item.detail.includes('label="Hide solution"') || item.detail.includes("gate=true"))) ||
    (item.step === "loading the solution does not unlock" && /passed=true/.test(item.detail)) ||
    (item.step === "loading the solution does not unlock" && !/editor matches=true/.test(item.detail)) ||
    (item.step === "light theme after reload" && !item.detail.includes("attr=light")) ||
    (["plain output", "plain output with a dead slot call", "split plain output with a dead slot call", "plain output with a cfg!(test) slot call", "two-slot call on the first line"].includes(item.step) &&
      (!item.detail.includes('state="missing {} slots"') || item.detail.includes("passed=true"))) ||
    (item.step === "formatted answer" && (!item.detail.includes("passed=true") || !item.detail.includes('state="output matches"'))) ||
    (item.step === "lesson 01 gate after passing" && !item.detail.includes("data-open=true")) ||
    ((item.step === "printing the expected output" || item.step === "hard-coded functions") && item.detail.includes("passed=true")),
);
console.log(`  ${results.length} checks, ${problems.length} with a problem`);
for (const problem of problems) console.log(`  PROBLEM ${problem.step}: ${problem.detail}`);

process.exit(problems.length === 0 ? 0 : 1);
