/* rust·learn: theme, navigation, progress, and the Playground runner. */

const PLAYGROUND_URL = "https://play.rust-lang.org/execute";

const STORE = {
  theme: "rustlearn.theme",
  progress: "rustlearn.progress",
};

const ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

/* The theme is stored as a bare string so the inline boot script can read it
   before any other script runs. */
function writeTheme(theme) {
  try {
    localStorage.setItem(STORE.theme, theme);
    return true;
  } catch (error) {
    return false;
  }
}

/* ------------------------------------------------------------- theme */

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function paintTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const nextLabel = theme === "light" ? "Switch to dark theme" : "Switch to light theme";

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    const icon = button.querySelector("[data-theme-icon]");
    const label = button.querySelector("[data-theme-label]");
    if (icon) icon.innerHTML = theme === "light" ? ICONS.sun : ICONS.moon;
    if (label) label.textContent = nextLabel;
  });

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f4eee6" : "#14110f");
}

function initTheme() {
  paintTheme(currentTheme());
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = currentTheme() === "light" ? "dark" : "light";
      paintTheme(next);
      writeTheme(next);
    });
  });
}

/* --------------------------------------------------------------- nav */

function initNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const panel = document.querySelector("[data-nav-panel]");
  if (!toggle || !panel) return;

  const setOpen = (open) => {
    panel.setAttribute("data-open", open ? "true" : "false");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    const label = toggle.querySelector("[data-nav-label]");
    if (label) label.textContent = open ? "Close menu" : "Open menu";
  };

  toggle.addEventListener("click", () => {
    setOpen(panel.getAttribute("data-open") !== "true");
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.getAttribute("data-open") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (panel.getAttribute("data-open") !== "true") return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 719 && panel.getAttribute("data-open") === "true") setOpen(false);
  });
}

/* ------------------------------------------------------------- copy */

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.top = "-1000px";
  document.body.appendChild(helper);
  helper.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (error) {
    ok = false;
  }
  helper.remove();
  return ok;
}

function flash(button, message) {
  if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent.trim();
  button.textContent = message;
  window.clearTimeout(Number(button.dataset.flashTimer || 0));
  button.dataset.flashTimer = String(
    window.setTimeout(() => {
      button.textContent = button.dataset.idleLabel;
    }, 1600),
  );
}

function initCopy() {
  document.querySelectorAll("[data-copy], [data-copy-text]").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", async () => {
      const explicit = button.getAttribute("data-copy-text");
      let text = explicit;
      if (text === null) {
        const figure = button.closest("figure");
        const code = figure ? figure.querySelector("pre code") : null;
        text = code ? code.textContent : "";
      }
      const ok = await copyText(text);
      flash(button, ok ? "Copied" : "Copy blocked");
    });
  });
}

/* ----------------------------------------------------------- runner */

function setOutput(root, { state, tone, stdout, stderr, showErrors }) {
  const out = root.querySelector("[data-bench-out], .code__out, .pg__out");
  if (!out) return;

  const stateEl = out.querySelector("[data-state]");
  const stdoutEl = out.querySelector("[data-out]");
  const stderrEl = out.querySelector("[data-err]");
  const moreWrap = out.querySelector(".out__more");

  out.hidden = false;
  if (stateEl) {
    stateEl.textContent = state;
    stateEl.className = "out__state" + (tone === "ok" ? " out__state--ok" : tone === "err" ? " out__state--err" : "");
  }
  if (stdoutEl) {
    stdoutEl.textContent = stdout || "";
    stdoutEl.classList.toggle("out__body--err", tone === "err" && !stdout);
  }
  if (stderrEl) stderrEl.textContent = stderr || "";
  if (moreWrap) {
    moreWrap.hidden = !(showErrors && stderr);
    if (moreWrap.hidden) moreWrap.open = false;
  }
}

async function runCode({ code, edition = "2024", mode = "debug" }) {
  const response = await fetch(PLAYGROUND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "stable",
      mode,
      edition,
      crateType: "bin",
      tests: false,
      code,
      backtrace: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`The playground answered ${response.status}.`);
  }

  const payload = await response.json();
  return {
    success: Boolean(payload.success),
    stdout: payload.stdout || "",
    stderr: payload.stderr || "",
  };
}

function initCodeRunners() {
  document.querySelectorAll("figure[data-runner]").forEach((figure) => {
    const codeEl = figure.querySelector("pre code");
    const runButton = figure.querySelector("[data-run]");
    if (!codeEl || !runButton) return;

    runButton.hidden = false;
    let busy = false;

    runButton.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      const idle = runButton.textContent;
      runButton.disabled = true;
      runButton.textContent = "Running";
      setOutput(figure, { state: "compiling", tone: "", stdout: "", stderr: "", showErrors: false });

      try {
        const result = await runCode({ code: codeEl.textContent });
        setOutput(figure, {
          state: result.success ? "exited 0" : "compile error",
          tone: result.success ? "ok" : "err",
          stdout: result.stdout,
          stderr: result.stderr,
          showErrors: true,
        });
      } catch (error) {
        setOutput(figure, {
          state: "request failed",
          tone: "err",
          stdout: `Could not reach the Rust Playground (${error.message}). Your code is unchanged; you can copy it into a local project and run cargo.`,
          stderr: "",
          showErrors: false,
        });
      } finally {
        busy = false;
        runButton.disabled = false;
        runButton.textContent = idle;
      }
    });
  });
}

function wireTextBox({ source, run, reset, status, edition, mode, root, initial }) {
  if (!source || !run) return;
  let busy = false;

  const execute = async () => {
    if (busy) return;
    busy = true;
    run.disabled = true;
    const idle = run.innerHTML;
    run.textContent = "Running";
    if (status) status.textContent = "compiling";
    setOutput(root, { state: "compiling", tone: "", stdout: "", stderr: "", showErrors: false });

    try {
      const result = await runCode({
        code: source.value,
        edition: edition ? edition.value : "2024",
        mode: mode ? mode.value : "debug",
      });
      setOutput(root, {
        state: result.success ? "exited 0" : "compile error",
        tone: result.success ? "ok" : "err",
        stdout: result.stdout,
        stderr: result.stderr,
        showErrors: true,
      });
      if (status) status.textContent = result.success ? "ok" : "error";
    } catch (error) {
      setOutput(root, {
        state: "request failed",
        tone: "err",
        stdout: `Could not reach the Rust Playground (${error.message}). Your source is unchanged.`,
        stderr: "",
        showErrors: false,
      });
      if (status) status.textContent = "offline";
    } finally {
      busy = false;
      run.disabled = false;
      run.innerHTML = idle;
    }
  };

  run.addEventListener("click", execute);

  source.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      execute();
    }
  });

  if (reset && initial !== undefined) {
    reset.addEventListener("click", () => {
      source.value = initial;
      source.focus();
    });
  }
}

function initHeroBench() {
  const bench = document.querySelector("[data-bench]");
  if (!bench) return;
  wireTextBox({
    source: bench.querySelector("[data-bench-source]"),
    run: bench.querySelector("[data-bench-run]"),
    reset: bench.querySelector("[data-bench-reset]"),
    status: null,
    root: bench,
    initial: bench.querySelector("[data-bench-source]").value,
  });
  const out = bench.querySelector("[data-bench-out]");
  if (out) {
    out.querySelector("[data-state]").dataset.state = "";
  }
}

function initPlayground() {
  const root = document.querySelector(".pg");
  if (!root) return;
  const source = root.querySelector("[data-pg-source]");
  const run = root.querySelector("[data-pg-run]");
  const clear = root.querySelector("[data-pg-clear]");
  const status = root.querySelector("[data-pg-status]");
  const edition = root.querySelector("[data-pg-edition]");
  const mode = root.querySelector("[data-pg-mode]");

  wireTextBox({ source, run, reset: null, status, edition, mode, root });

  if (clear) {
    clear.addEventListener("click", () => {
      const out = root.querySelector(".pg__out");
      if (!out) return;
      out.querySelector("[data-out]").textContent = "";
      out.querySelector("[data-err]").textContent = "";
      const state = out.querySelector("[data-state]");
      state.textContent = "";
      state.className = "out__state";
      const more = out.querySelector(".out__more");
      if (more) {
        more.open = false;
        more.hidden = true;
      }
      if (status) status.textContent = "idle";
    });
  }
}

/* ---------------------------------------------------------- progress */

function readProgress() {
  const stored = read(STORE.progress, []);
  return Array.isArray(stored) ? stored.filter((item) => typeof item === "string") : [];
}

function paintProgress() {
  const done = new Set(readProgress());
  const total = Number(document.body.dataset.lessonTotal || 0);

  document.querySelectorAll("[data-lesson-row]").forEach((row) => {
    const slug = row.getAttribute("data-lesson-row");
    const isDone = done.has(slug);
    row.dataset.done = isDone ? "true" : "false";
    const stateEl = row.querySelector("[data-state-for]");
    if (stateEl) {
      stateEl.textContent = isDone ? "Completed" : "Not started";
      stateEl.style.color = isDone ? "var(--amber)" : "";
    }
  });

  if (total > 0) {
    document.querySelectorAll("[data-progress-fill]").forEach((fill) => {
      fill.style.width = `${Math.round((done.size / total) * 100)}%`;
    });
    document.querySelectorAll("[data-progress-label]").forEach((label) => {
      label.textContent = `${Math.min(done.size, total)} of ${total} complete`;
    });
  }
}

function initComplete() {
  const button = document.querySelector("[data-complete]");
  if (!button) return;
  const slug = button.getAttribute("data-complete");
  const label = button.querySelector("[data-complete-label]");
  const state = document.querySelector("[data-complete-state]");

  const sync = () => {
    const done = new Set(readProgress());
    const isDone = done.has(slug);
    button.setAttribute("aria-pressed", isDone ? "true" : "false");
    if (label) label.textContent = isDone ? "Completed. Click to undo" : "Mark lesson complete";
    if (state) state.hidden = !isDone;
    button.style.borderColor = isDone ? "var(--amber)" : "";
    button.style.color = isDone ? "var(--amber)" : "";
  };

  button.addEventListener("click", () => {
    const done = new Set(readProgress());
    if (done.has(slug)) done.delete(slug);
    else done.add(slug);
    writeStore(STORE.progress, [...done]);
    sync();
  });

  sync();
}

/* ------------------------------------------------------------- boot */

function boot() {
  initTheme();
  initNav();
  initCopy();
  initCodeRunners();
  initHeroBench();
  initPlayground();
  initComplete();
  paintProgress();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
