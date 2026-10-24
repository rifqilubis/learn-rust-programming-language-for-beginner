import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { withNumbers, groups } from "./content/lessons.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = (path) => join(here, path);

const lessons = withNumbers();
const totalMinutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
const lessonHref = (lesson) => `lesson-${lesson.number}-${lesson.slug}.html`;

const SITE = {
  name: "rust·learn",
  repo: "https://github.com/rifqilubis/learn-rust-programming-language-for-beginner",
};

const THEME_BOOT = `(function () {
  try {
    var stored = localStorage.getItem("rustlearn.theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (error) {
    /* storage can be blocked; the dark default still applies */
  }
})();`;

const ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg class="btn__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>',
};

function head({ title, description, page }) {
  const fullTitle = page === "home" ? `${SITE.name} · a beginner Rust course` : `${title} · ${SITE.name}`;
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${description}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#14110f">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/zilla-slab-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/source-sans-3-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/site.css">
<script>${THEME_BOOT}</script>
</head>`;
}

function nav(current) {
  const items = [
    { href: "index.html", label: "Course", match: "home" },
    { href: "lessons.html", label: "All lessons", match: "lessons" },
    { href: "playground.html", label: "Playground", match: "playground" },
  ];
  const active = (match) => (current === match ? ' aria-current="page"' : "");

  return `<header class="site-head">
  <div class="wrap site-head__inner">
    <a class="wordmark" href="index.html">rust<span class="wordmark__dot" aria-hidden="true">·</span>learn</a>
    <nav class="site-nav" aria-label="Main">
      ${items.map((item) => `<a class="site-nav__link" href="${item.href}"${active(item.match)}>${item.label}</a>`).join("\n      ")}
      <button class="icon-btn" type="button" data-theme-toggle aria-pressed="false">
        <span data-theme-icon>${ICONS.moon}</span>
        <span class="sr-only" data-theme-label>Switch to light theme</span>
      </button>
    </nav>
    <button class="icon-btn nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="mobile-nav">
      <span class="ico ico--menu">${ICONS.menu}</span>
      <span class="ico ico--close">${ICONS.close}</span>
      <span class="sr-only" data-nav-label>Open menu</span>
    </button>
  </div>
  <div class="site-nav__panel" id="mobile-nav" data-nav-panel data-open="false">
    <ul>
      ${items.map((item) => `<li><a href="${item.href}"${active(item.match)}>${item.label}</a></li>`).join("\n      ")}
      <li><button class="icon-btn icon-btn--flat" type="button" data-theme-toggle aria-pressed="false">
        <span data-theme-icon>${ICONS.moon}</span>
        <span data-theme-label>Switch to light theme</span>
      </button></li>
    </ul>
  </div>
</header>`;
}

function foot() {
  return `<footer class="site-foot">
  <div class="wrap">
    <div class="site-foot__row">
      <a class="wordmark" href="index.html">rust<span class="wordmark__dot" aria-hidden="true">·</span>learn</a>
      <div class="site-foot__links">
        <a href="lessons.html">All lessons</a>
        <a href="playground.html">Playground</a>
        <a href="${SITE.repo}">Source on GitHub</a>
      </div>
    </div>
    <p class="site-foot__note">
      Code runs on the public <a href="https://play.rust-lang.org">Rust Playground</a>, operated by the Rust project, not by this site. Anything you run is sent there. Your progress is stored in this browser only.
    </p>
  </div>
</footer>`;
}

function scripts({ prism = false } = {}) {
  const parts = [];
  if (prism) {
    parts.push(`<script src="assets/vendor/prism-core.min.js"></script>`);
    parts.push(`<script src="assets/vendor/prism-clike.min.js"></script>`);
    parts.push(`<script src="assets/vendor/prism-rust.min.js"></script>`);
  }
  parts.push(`<script src="assets/js/site.js"></script>`);
  return parts.join("\n");
}

function page({ title, description, current, body, prism = false, bodyAttrs = "" }) {
  return `${head({ title, description, page: current })}
<body${bodyAttrs}>
<a class="skip" href="#main">Skip to content</a>
${nav(current)}
<main id="main">
${body}
</main>
${foot()}
${scripts({ prism })}
</body>
</html>
`;
}

function ledgerRows(list, { showLede = true } = {}) {
  return list
    .map(
      (lesson) => `<a class="ledger__row" href="${lessonHref(lesson)}" data-lesson-row="${lesson.slug}">
  <span class="ledger__num">${lesson.number}</span>
  <span class="ledger__body">
    <span class="ledger__title">${lesson.title}</span>
    ${showLede ? `<span class="ledger__sub">${lesson.lede}</span>` : ""}
  </span>
  <span class="ledger__meta">
    <span class="ledger__time">${lesson.minutes} min</span>
    <span class="ledger__state" data-state-for="${lesson.slug}">Not started</span>
  </span>
</a>`,
    )
    .join("\n");
}

/* ------------------------------------------------------------------ home */

const HERO_CODE = `fn main() {
    let parts = 12;

    if parts > 0 {
        println!("{parts} parts on the bench");
    }
}`;

function homePage() {
  const first = lessons[0];

  const body = `<section class="hero">
  <div class="wrap hero__grid">
    <div>
      <p class="hero__stamp">${lessons.length} lessons · no experience needed</p>
      <h1 class="hero__title">Learn Rust by <em>running</em> it.</h1>
      <p class="hero__lede">A beginner course that starts at installing the compiler and ends with you writing tests for your own code. Every sample on this site runs, here, in the page.</p>
      <div class="hero__actions">
        <a class="btn btn--primary" href="${lessonHref(first)}">Start with lesson 01</a>
        <a class="btn btn--ghost" href="lessons.html">See all ${lessons.length} lessons</a>
      </div>
      <p class="hero__note"><strong>No account, no signup.</strong> Code is compiled by the public Rust Playground. Your progress stays in this browser.</p>
    </div>
    <div class="bench" data-bench>
      <div class="bench__bar">
        <span class="bench__file">main.rs</span>
        <span class="bench__meta">edition 2024 · stable</span>
      </div>
      <label class="sr-only" for="hero-code">Rust source code</label>
      <textarea class="bench__input" id="hero-code" data-bench-source spellcheck="false" autocapitalize="off" autocomplete="off">${escapeHtml(HERO_CODE)}</textarea>
      <div class="bench__actions">
        <button class="btn btn--primary" type="button" data-bench-run>${ICONS.play}Run</button>
        <button class="btn btn--quiet" type="button" data-bench-reset>Reset</button>
        <span class="bench__hint">Ctrl + Enter</span>
      </div>
      <div class="out bench__out" data-bench-out hidden>
        <div class="out__head"><span>output</span><span class="out__state" data-state></span></div>
        <pre class="out__body" data-out aria-live="polite"></pre>
        <details class="out__more">
          <summary>Compiler messages</summary>
          <pre data-err></pre>
        </details>
      </div>    </div>
  </div>
</section>

<section class="section" id="course">
  <div class="wrap">
    <div class="section__head">
      <span class="section__num">01</span>
      <div>
        <h2 class="section__title">The course, in order</h2>
        <p class="section__lede">Each lesson is one idea, a few runnable samples, and one exercise. Read them in sequence the first time; the ownership lessons assume the ones before.</p>
      </div>
    </div>
    <div class="ledger">
${ledgerRows(lessons)}
    </div>
    <div class="progress">
      <span class="progress__track"><span class="progress__fill" data-progress-fill></span></span>
      <span class="progress__label" data-progress-label>0 of ${lessons.length} complete</span>
    </div>
  </div>
</section>

<section class="section" id="how">
  <div class="wrap">
    <div class="section__head">
      <span class="section__num">02</span>
      <div>
        <h2 class="section__title">How to use this site</h2>
        <p class="section__lede">Three habits make the difference between reading about Rust and knowing it.</p>
      </div>
    </div>
    <div class="split">
      <div class="setup">
        <h3 class="setup__title">Get the toolchain first</h3>
        <p class="setup__lede">Lesson 01 walks through this in detail. If you want to start now, one command installs everything.</p>
        <div class="cmd">
          <span class="cmd__text"><code>curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh</code></span>
          <button class="btn btn--quiet" type="button" data-copy-text="curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh" hidden>Copy</button>
        </div>
        <ul class="setup__list">
          <li>${ICONS.check}<span><strong>Type the samples yourself.</strong> Copying skips the part where your hands learn the syntax.</span></li>
          <li>${ICONS.check}<span><strong>Break them on purpose.</strong> Delete a semicolon, move a value twice, and read what the compiler says.</span></li>
          <li>${ICONS.check}<span><strong>Do the exercise before the next lesson.</strong> It is the only part that proves you can write it.</span></li>
        </ul>
      </div>
      <div>
        <h3 class="setup__title">What this site runs on</h3>
        <p class="setup__lede">Every code block with a <strong>Run this</strong> button sends the exact source to the Rust Playground and prints what comes back, standard output and compiler messages alike. Nothing is simulated.</p>
        <p class="muted-p">If the request fails, the block says so and leaves your source untouched, so you can copy it into a local project. The <a href="playground.html">playground page</a> is the same idea with a larger editor and an edition picker.</p>
        <p class="muted-p">The lesson text follows the official <a href="https://doc.rust-lang.org/book/">Rust Book</a> in scope. Where this course is shorter, the book is the place to go deeper.</p>
      </div>
    </div>
  </div>
</section>`;

  return page({
    title: "Course",
    description:
      "A twelve lesson Rust course for people who have never compiled anything. Every sample runs in the browser against the public Rust Playground.",
    current: "home",
    prism: true,
    bodyAttrs: ` data-lesson-total="${lessons.length}"`,
    body,
  });
}

/* --------------------------------------------------------------- lessons */

function lessonsPage() {
  const rows = groups
    .map((group) => {
      const inGroup = lessons.filter((lesson) => lesson.group === group);
      return `<h2 class="group-label">${group}</h2>
<div class="ledger">
${ledgerRows(inGroup)}
</div>`;
    })
    .join("\n");

  const body = `<section class="lesson-head">
  <div class="wrap">
    <p class="lesson-head__meta"><span>Course map</span><span>${lessons.length} lessons</span><span>${Math.round(totalMinutes / 60)} hours of reading</span></p>
    <h1 class="lesson-head__title">Every lesson, in the order they build</h1>
    <p class="lesson-head__lede">The first six lessons give you the language. The next three give you the ownership model, which is the part that makes Rust Rust. The last three turn it into programs you can keep.</p>
  </div>
</section>
<section class="section section--tight">
  <div class="wrap">
${rows}
    <div class="progress">
      <span class="progress__track"><span class="progress__fill" data-progress-fill></span></span>
      <span class="progress__label" data-progress-label>0 of ${lessons.length} complete</span>
    </div>
  </div>
</section>`;

  return page({
    title: "All lessons",
    description: "The full twelve lesson Rust course, grouped from setup through ownership to real programs.",
    current: "lessons",
    bodyAttrs: ` data-lesson-total="${lessons.length}"`,
    body,
  });
}

/* ------------------------------------------------------------ playground */

function playgroundPage() {
  const body = `<section class="lesson-head">
  <div class="wrap">
    <p class="lesson-head__meta"><span>Playground</span><span>Compiled remotely</span></p>
    <h1 class="lesson-head__title">Write Rust, press run</h1>
    <p class="lesson-head__lede">A scratch pad for the lessons. Your source is sent to the public Rust Playground and compiled with the edition you pick. Nothing is saved on this site.</p>
  </div>
</section>
<section class="section section--tight">
  <div class="wrap pg">
    <div class="pg__panel">
      <div class="bench__bar">
        <span class="bench__file">main.rs</span>
        <span class="bench__meta" data-pg-status>idle</span>
      </div>
      <label class="sr-only" for="pg-source">Rust source code</label>
      <textarea class="bench__input" id="pg-source" data-pg-source spellcheck="false" autocapitalize="off" autocomplete="off">fn main() {
    let names = ["Ada", "Grace", "Ferris"];

    for (index, name) in names.iter().enumerate() {
        println!("{}: {}", index + 1, name);
    }
}</textarea>
      <div class="bench__actions">
        <button class="btn btn--primary" type="button" data-pg-run>${ICONS.play}Run</button>
        <button class="btn btn--quiet" type="button" data-pg-clear>Clear output</button>
        <span class="bench__hint">Ctrl + Enter</span>
      </div>
    </div>
    <div>
      <div class="field">
        <label for="pg-edition">Edition</label>
        <select id="pg-edition" data-pg-edition>
          <option value="2024" selected>2024</option>
          <option value="2021">2021</option>
          <option value="2018">2018</option>
        </select>
      </div>
      <div class="field">
        <label for="pg-mode">Build profile</label>
        <select id="pg-mode" data-pg-mode>
          <option value="debug" selected>debug, overflow checks on</option>
          <option value="release">release, optimized</option>
        </select>
      </div>
      <div class="out pg__out">
        <div class="out__head"><span>output</span><span class="out__state" data-state></span></div>
        <pre class="out__body" data-out aria-live="polite"></pre>
        <details class="out__more">
          <summary>Compiler messages</summary>
          <pre data-err></pre>
        </details>
      </div>
    </div>
  </div>
</section>`;

  return page({
    title: "Playground",
    description:
      "A Rust scratch pad that compiles against the public Rust Playground, with edition and build profile controls.",
    current: "playground",
    body,
  });
}

/* ---------------------------------------------------------------- lesson */

function lessonPage(lesson, index) {
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const bodyHtml = lesson.body();
  const toc = extractHeadings(bodyHtml);

  const navPrev = prev
    ? `<a class="btn btn--ghost" href="${lessonHref(prev)}">Previous: ${prev.title}</a>`
    : `<a class="btn btn--ghost" href="lessons.html">Back to the course map</a>`;
  const navNext = next
    ? `<a class="btn btn--primary" href="${lessonHref(next)}">Next: ${next.title}</a>`
    : `<a class="btn btn--primary" href="playground.html">Open the playground</a>`;

  const body = `<article>
  <header class="lesson-head">
    <div class="wrap">
      <p class="lesson-head__meta">
        <span class="lesson-head__num">Lesson ${lesson.number}</span>
        <span>${lesson.group}</span>
        <span>${lesson.minutes} min</span>
      </p>
      <h1 class="lesson-head__title">${lesson.title}</h1>
      <p class="lesson-head__lede">${lesson.lede}</p>
    </div>
  </header>
  <div class="wrap lesson-body">
    <nav class="toc" aria-label="On this page">
      <p class="toc__title">On this page</p>
      <ol>
${toc.map((item) => `        <li><a href="#${item.id}">${item.text}</a></li>`).join("\n")}
      </ol>
    </nav>
    <div>
      <div class="prose">
${bodyHtml}
        <aside class="callout">
          <span class="callout__tag">Exercise</span>
          <div>
            <p>${lesson.exercise.prompt}</p>
            <details class="hint">
              <summary>Show a hint</summary>
              <p>${lesson.exercise.hint}</p>
            </details>
          </div>
        </aside>
      </div>
      <footer class="lesson-foot">
        <button class="btn btn--ghost" type="button" data-complete="${lesson.slug}" aria-pressed="false">
          <span data-complete-icon>${ICONS.check}</span>
          <span data-complete-label>Mark lesson complete</span>
        </button>
        <span class="complete-state" data-complete-state hidden>${ICONS.check} Completed</span>
      </footer>
      <nav class="lesson-foot__nav" aria-label="Lesson navigation">
        ${navPrev}
        ${navNext}
      </nav>
    </div>
  </div>
</article>`;

  return page({
    title: lesson.title,
    description: lesson.lede,
    current: "lessons",
    prism: true,
    body,
  });
}

function extractHeadings(html) {
  const found = [];
  const re = /<h2 id="([^"]+)">[\s\S]*?<span>([^<]+)<\/span><\/h2>/g;
  let match;
  while ((match = re.exec(html))) found.push({ id: match[1], text: match[2] });
  return found;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ------------------------------------------------------------------ main */

const written = [];

function write(path, contents) {
  const target = out(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
  written.push(path);
}

write("index.html", homePage());
write("lessons.html", lessonsPage());
write("playground.html", playgroundPage());
lessons.forEach((lesson, index) => write(lessonHref(lesson), lessonPage(lesson, index)));

console.log(`built ${written.length} pages, ${totalMinutes} minutes of material`);
for (const file of written) console.log("  " + file);
