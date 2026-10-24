const ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function esc(value) {
  return String(value).replace(/[&<>"]/g, (char) => ESCAPES[char]);
}

/**
 * Every sample the build renders, with the output it claims to print.
 * tools/verify-samples.mjs compiles each one and checks the claim, so a
 * sample that drifts from the compiler fails the build check instead of
 * quietly lying on the page.
 */
export const expectations = [];

/**
 * A code block. Runnable samples get data-runner so site.js can wire the
 * Run and Copy buttons to the Rust Playground API.
 */
export function sample(code, options = {}) {
  const {
    label = "main.rs",
    run = true,
    out = "",
    tag = run ? "runs in the browser" : "read it, then try it locally",
    note = "",
  } = options;

  expectations.push({
    code: code.trim(),
    expect: out,
    shouldCompile: run,
    label,
    tag,
    note,
  });

  return `<figure class="code"${run ? " data-runner" : ""} data-label="${esc(label)}">
  <div class="code__label">${esc(label)}</div>
  <pre><code class="language-rust">${esc(code.trim())}</code></pre>
  <div class="out code__out" hidden>
    <div class="out__head"><span>output</span><span class="out__state" data-state></span></div>
    <pre class="out__body" data-out aria-live="polite"></pre>
    <details class="out__more">
      <summary>Compiler messages</summary>
      <pre data-err></pre>
    </details>
  </div>
  <div class="code__foot">
    ${run ? `<button class="btn btn--run" type="button" data-run hidden>Run this</button>` : ""}
    <button class="btn btn--quiet" type="button" data-copy hidden>Copy</button>
    <span class="code__tag">${esc(tag)}</span>
  </div>
  ${note ? `<p class="code__note">${note}</p>` : ""}
</figure>`;
}

export function callout(kind, tag, html) {
  const modifier = kind === "note" ? " callout--note" : "";
  return `<aside class="callout${modifier}">
  <span class="callout__tag">${esc(tag)}</span>
  <div>${html}</div>
</aside>`;
}

export function cmd(text) {
  return `<div class="cmd">
  <span class="cmd__text"><code>${esc(text)}</code></span>
  <button class="btn btn--quiet" type="button" data-copy-text="${esc(text)}" hidden>Copy</button>
</div>`;
}

/** Groups a lesson's sections and numbers the h2s in the margin, per DESIGN.md. */
export function sections(list) {
  return list
    .map((section, index) => {
      const id = section.id ?? slugify(section.title);
      const num = String(index + 1).padStart(2, "0");
      return `<h2 id="${id}"><span class="h2num" aria-hidden="true">${num}</span><span>${section.title}</span></h2>
${section.html}`;
    })
    .join("\n");
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
