/* rust·learn: theme, navigation, progress, and the Playground runner. */

import {
  checksFor,
  createHiddenSuite,
  gradeSubmission,
  describeValue,
  looksLikeCompileError,
  stripMarkers,
} from "./exercises.js";

const PLAYGROUND_URL = "https://play.rust-lang.org/execute";

const STORE = {
  theme: "rustlearn.theme",
  progress: "rustlearn.progress",
  exercises: "rustlearn.exercises",
  exerciseCode: "rustlearn.exercise-code",
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
  const out = root.querySelector("[data-bench-out], .code__out, .pg__out, [data-ex-out]");
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

async function runCode({ code, edition = "2024", mode = "debug", tests = false }) {
  const response = await fetch(PLAYGROUND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "stable",
      mode,
      edition,
      crateType: "bin",
      tests: Boolean(tests),
      code,
      backtrace: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`The playground answered ${response.status}.`);
  }

  const payload = await response.json();
  /* The Playground answers 200 with { error } when the run itself fails,
     for example when a program loops past the execution deadline. */
  const error = typeof payload.error === "string" ? payload.error : "";
  return {
    success: Boolean(payload.success) && error === "",
    stdout: payload.stdout || "",
    stderr: payload.stderr || error,
    error,
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
        const label = result.error && /timed out|deadline/i.test(result.error) ? "timed out" : result.success ? "exited 0" : "compile error";
        setOutput(figure, {
          state: label,
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
      const label = result.error && /timed out|deadline/i.test(result.error) ? "timed out" : result.success ? "exited 0" : "compile error";
      setOutput(root, {
        state: label,
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

/* ---------------------------------------------------------- exercises */

function readPassed() {
  const stored = read(STORE.exercises, []);
  return Array.isArray(stored) ? stored.filter((item) => typeof item === "string") : [];
}

function readDrafts() {
  const stored = read(STORE.exerciseCode, {});
  return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
}

function saveDraft(slug, code) {
  const drafts = readDrafts();
  drafts[slug] = code;
  writeStore(STORE.exerciseCode, drafts);
}

function normalise(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .trim();
}

/* Grade an exercise on two independent axes:
 *
 *   1. behaviour  the hidden module calls the reader's functions with values
 *                 drawn now, and reports each result on a private marker
 *                 channel. The page compares those results with values it
 *                 computed itself, so printing the expected text cannot pass;
 *   2. output     the program must still print what the exercise asked for,
 *                 so implementing the functions but deleting the output
 *                 does not pass either.
 *
 * Both run at the same time. A pass needs both, or just behaviour for the
 * test-writing lesson, where the output is not the point.
 *
 * The expected values never go to the Playground, so the reader's program
 * cannot read them. The only way to produce a matching marker line is to
 * compute the answer.
 *
 * In the test-writing lesson the reader's own tests are also run against a
 * deliberately broken `word_count`. If they still pass, they are not testing
 * anything, and the exercise is not finished. */
async function gradeExercise({ code, slug, tests, expected, ownTests }) {
  const checks = checksFor(slug);
  const suite = createHiddenSuite(slug, checks);

  if (suite.code === "") {
    return { ok: false, kind: "config", message: "This exercise has no checks configured, so it cannot be graded." };
  }

  const wantsOutput = !tests && normalise(expected) !== "";
  const behaviourPromise = runCode({ code: `${code}\n${suite.code}`, tests: true });
  const outputPromise = wantsOutput ? runCode({ code, tests: false }) : Promise.resolve(null);

  const [behaviour, output] = await Promise.all([behaviourPromise, outputPromise]);

  for (const result of [behaviour, output]) {
    if (result && result.error && /timed out|deadline/i.test(result.error)) {
      return {
        ok: false,
        kind: "timeout",
        message: "The program ran past the Playground's time limit. Look for a loop that never ends.",
      };
    }
  }

  const graded = await gradeSubmission({
    code,
    suite,
    result: behaviour,
    ownTests,
    runTests: (source) => runCode({ code: source, tests: true }),
  });

  if (!graded.pass) {
    if (graded.kind === "compile") {
      return {
        ok: false,
        kind: "compile",
        message: "The code did not compile against the hidden checks. Read the first compiler error: it usually names the missing function, the wrong return type, or the exact fix.",
        result: behaviour,
      };
    }
    if (graded.kind === "own-tests") {
      return {
        ok: false,
        kind: "own-tests",
        message: `${graded.message} Keep the three #[test] functions; the hint shows the shape of an assertion.`,
        result: behaviour,
      };
    }
    if (graded.missing) {
      return {
        ok: false,
        kind: "hidden",
        message: `One of the checks never reported a result (${graded.item.input}). The program probably stopped before it ran, or a function hung.`,
        result: behaviour,
      };
    }
    if (graded.duplicate || graded.unexpected) {
      return {
        ok: false,
        kind: "hidden",
        message: "The program printed a result the checker did not ask for, or printed one twice. Remove any code that writes lines starting with __RUSTLEARN__.",
        result: behaviour,
      };
    }
    if (graded.message) {
      return {
        ok: false,
        kind: "hidden",
        message: graded.message,
        result: behaviour,
      };
    }
    return {
      ok: false,
      kind: "hidden",
      message: `Your function was called with ${graded.item.input} and returned ${describeValue(graded.got)}, which is not right for those inputs. Work the answer out on paper, then fix the function.`,
      result: behaviour,
    };
  }

  if (output) {
    if (looksLikeCompileError(output.stderr) && !output.success) {
      return {
        ok: false,
        kind: "compile",
        message: "The hidden checks pass, but the program itself does not compile and run. Fix the compiler error in the messages below.",
        result: output,
      };
    }
    if (!output.success) {
      return {
        ok: false,
        kind: "run",
        message: "The hidden checks pass, but the program did not exit cleanly. Fix the panic or error in the messages below.",
        result: output,
      };
    }
    if (normalise(output.stdout) !== normalise(expected)) {
      return {
        ok: false,
        kind: "output",
        message: difference(output.stdout, expected),
        result: output,
      };
    }
  }

  return {
    ok: true,
    hiddenCount: suite.count,
    result: {
      ...(output || behaviour),
      stdout: stripMarkers((output || behaviour).stdout),
      stderr: stripMarkers((output || behaviour).stderr),
    },
    outputChecked: Boolean(output),
  };
}

/* Tips and the reference solution are help, not a shortcut. Opening either
   panel, copying the solution, or loading it into the editor never unlocks the
   lesson; only a passing Check answer does. */
function initExerciseHelp(root, { source, say, setState }) {
  const tipsDetails = root.querySelector('details[data-ex-help="tips"]');
  const solutionDetails = root.querySelector('details[data-ex-help="solution"]');
  const tipsSummary = tipsDetails ? tipsDetails.querySelector("summary") : null;
  const solutionPanel = solutionDetails ? solutionDetails.querySelector(".exercise__solution") : null;

  /* <details> opens and closes natively, and CSS swaps the visible label from
     the `open` attribute, so the help still works with JavaScript off. This
     only clears the nudge once the tips have been opened. */
  tipsDetails?.addEventListener("toggle", () => {
    if (tipsDetails.open) tipsSummary?.removeAttribute("data-nudge");
  });

  const solutionCode = solutionPanel ? solutionPanel.querySelector("pre code") : null;
  const copyButton = solutionPanel ? solutionPanel.querySelector("[data-ex-copy]") : null;
  const fillButton = solutionPanel ? solutionPanel.querySelector("[data-ex-fill]") : null;

  copyButton?.addEventListener("click", async () => {
    const ok = await copyText(solutionCode ? solutionCode.textContent : "");
    flash(copyButton, ok ? "Copied" : "Copy blocked");
  });

  fillButton?.addEventListener("click", () => {
    if (!solutionCode) return;
    source.value = solutionCode.textContent;
    saveDraft(root.getAttribute("data-exercise"), source.value);
    setState("not checked", "");
    say("Solution loaded. Press Check answer to run it; the lesson stays locked until it passes.", "");
    source.focus();
  });

  /* After a couple of failed checks, point at the tips instead of repeating
     the same error message. Opening the panel clears the nudge. */
  return {
    nudgeTips() {
      if (!tipsDetails || !tipsSummary || tipsDetails.open) return false;
      tipsSummary.setAttribute("data-nudge", "true");
      return true;
    },
  };
}

function initExercise() {
  const root = document.querySelector("[data-exercise]");
  if (!root) return;

  const slug = root.getAttribute("data-exercise");
  const source = root.querySelector("[data-ex-source]");
  const check = root.querySelector("[data-ex-check]");
  const reset = root.querySelector("[data-ex-reset]");
  const state = root.querySelector("[data-ex-state]");
  const verdict = root.querySelector("[data-ex-verdict]");
  const configEl = root.querySelector("[data-ex-config]");
  if (!source || !check || !configEl) return;

  let config = { slug, mode: "run", expected: "", ownTests: 0 };
  try {
    config = { ...config, ...JSON.parse(configEl.textContent) };
  } catch (error) {
    /* a broken config should not stop the page from working */
  }

  const starter = source.value;
  const drafts = readDrafts();
  if (typeof drafts[slug] === "string" && drafts[slug] !== "") source.value = drafts[slug];

  let busy = false;
  let escapeArmed = false;

  const say = (message, tone) => {
    if (!verdict) return;
    verdict.textContent = message;
    verdict.dataset.tone = tone || "";
  };

  const setState = (text, tone) => {
    if (!state) return;
    state.textContent = text;
    state.dataset.tone = tone || "";
  };

  /* A pass is permanent for this lesson: editing after it unlocks does not
     take it away, because the point is that you got there once. */
  const unlock = () => {
    root.dataset.passed = "true";
    const passed = new Set(readPassed());
    passed.add(slug);
    writeStore(STORE.exercises, [...passed]);
    document.dispatchEvent(new CustomEvent("exercise:result", { detail: { slug, passed: true } }));
  };

  root.dataset.passed = readPassed().includes(slug) ? "true" : "false";
  document.dispatchEvent(new CustomEvent("exercise:result", { detail: { slug, passed: root.dataset.passed === "true" } }));

  const help = initExerciseHelp(root, { source, say, setState });
  let failedChecks = 0;

  let draftTimer = 0;
  source.addEventListener("input", () => {
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(() => saveDraft(slug, source.value), 400);
    if (root.dataset.passed === "true") return;
    say("", "");
  });
  source.addEventListener("blur", () => {
    window.clearTimeout(draftTimer);
    saveDraft(slug, source.value);
  });
  window.addEventListener("pagehide", () => saveDraft(slug, source.value));

  check.addEventListener("click", async () => {
    if (busy) return;
    const code = source.value.trim();
    if (code === "") {
      say("The editor is empty. Write something first.", "err");
      return;
    }

    busy = true;
    check.disabled = true;
    const idle = check.innerHTML;
    check.textContent = "Checking";
    setState("running tests", "");
    say("", "");
    setOutput(root, { state: "compiling", tone: "", stdout: "", stderr: "", showErrors: false });

    try {
      const verdictResult = await gradeExercise({
        code,
        slug,
        tests: config.mode === "tests",
        expected: config.expected || "",
        ownTests: config.ownTests || 0,
      });

      if (verdictResult.result) {
        const { result } = verdictResult;
        setOutput(root, {
          state: verdictResult.ok ? "all checks passed" : verdictResult.kind === "hidden" ? "checks failed" : "did not pass",
          tone: verdictResult.ok ? "ok" : "err",
          stdout: stripMarkers(result.stdout),
          stderr: stripMarkers(result.stderr),
          showErrors: true,
        });
      }

      if (verdictResult.ok) {
        setState(`${verdictResult.hiddenCount} checks passed`, "ok");
        say(
          verdictResult.outputChecked
            ? "Every hidden check passed and the output matches the exercise exactly. Lesson unlocked."
            : "Every hidden check passed, including calls with values you had not seen. Lesson unlocked.",
          "ok",
        );
        unlock();
        return;
      }

      const labels = {
        timeout: "timed out",
        compile: "compile error",
        run: "crashed",
        output: "output differs",
        "own-tests": "tests missing",
        hidden: "hidden checks failed",
        config: "checker error",
      };
      setState(labels[verdictResult.kind] || "did not pass", "err");
      say(verdictResult.message, "err");
      failedChecks += 1;
      if (failedChecks >= 2) help.nudgeTips();
    } catch (error) {
      setState("request failed", "err");
      setOutput(root, {
        state: "request failed",
        tone: "err",
        stdout: `Could not reach the Rust Playground (${error.message}). Your code is saved in this browser; try again in a moment.`,
        stderr: "",
        showErrors: false,
      });
      say("The checker could not run. This is a network problem, not a mistake in your code.", "err");
    } finally {
      busy = false;
      check.disabled = false;
      check.innerHTML = idle;
    }
  });

  reset.addEventListener("click", () => {
    source.value = starter;
    saveDraft(slug, starter);
    const out = root.querySelector("[data-ex-out]");
    if (out) {
      out.hidden = true;
      out.querySelector("[data-out]").textContent = "";
      out.querySelector("[data-err]").textContent = "";
      const outState = out.querySelector("[data-state]");
      outState.textContent = "";
      outState.className = "out__state";
      const more = out.querySelector(".out__more");
      if (more) {
        more.open = false;
        more.hidden = true;
      }
    }
    setState("not checked", "");
    say("", "");
    source.focus();
  });

  source.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      check.click();
      return;
    }
    if (event.key === "Escape") {
      escapeArmed = true;
      return;
    }
    if (event.key === "Tab") {
      /* Tab indents, and Escape then Tab leaves the editor, so the keyboard
         is never trapped inside a textarea. */
      if (escapeArmed) {
        escapeArmed = false;
        return;
      }
      event.preventDefault();
      source.setRangeText("    ", source.selectionStart, source.selectionEnd, "end");
      saveDraft(slug, source.value);
      return;
    }
    escapeArmed = false;
  });
}

/* Explain a mismatch in terms a beginner can act on. */
function difference(actualRaw, expectedRaw) {
  const actual = normalise(actualRaw);
  const expected = normalise(expectedRaw);
  const actualLines = actual === "" ? [] : actual.split("\n");
  const expectedLines = expected === "" ? [] : expected.split("\n");

  if (actual === "") return "Your program printed nothing. The checker compares standard output, so add the println! calls the exercise asks for.";

  if (actualLines.length !== expectedLines.length) {
    return `Not yet. The page expects ${expectedLines.length} line${expectedLines.length === 1 ? "" : "s"} and your program printed ${actualLines.length}. Compare the two panels above, line by line.`;
  }

  const at = actualLines.findIndex((line, index) => line !== expectedLines[index]);
  if (at === -1) return "Not yet. The lines match but something else differs. Reset the code and start from the exercise text.";
  return `Not yet. Line ${at + 1} should be "${expectedLines[at]}" and yours is "${actualLines[at]}".`;
}

/* The completion button and the next link stay locked until the exercise
   passes. Both listen for the same event, so the gate lives in one place. */
function initExerciseGate() {
  const button = document.querySelector("[data-complete]");
  const next = document.querySelector("[data-next]");
  const locked = document.querySelector("[data-next-locked]");
  const exercise = document.querySelector("[data-exercise]");
  const slug = button ? button.getAttribute("data-complete") : null;
  if (!slug) return;

  const passed = () => {
    if (exercise) return exercise.dataset.passed === "true";
    return readPassed().includes(slug);
  };

  const sync = () => {
    const open = passed();
    const done = new Set(readProgress()).has(slug);

    if (button) {
      button.disabled = !open && !done;
      button.setAttribute("aria-pressed", done ? "true" : "false");
      const label = button.querySelector("[data-complete-label]");
      if (label) {
        label.textContent = done
          ? "Completed. Click to undo"
          : open
            ? "Mark lesson complete"
            : "Finish the exercise to unlock";
      }
      const state = document.querySelector("[data-complete-state]");
      if (state) state.hidden = !done;
      button.style.borderColor = done ? "var(--amber)" : "";
      button.style.color = done ? "var(--amber)" : "";
    }

    if (next && locked) {
      const gateWrap = document.querySelector("[data-next-gate]");
      if (gateWrap) gateWrap.dataset.open = open ? "true" : "false";
    }
  };

  document.addEventListener("exercise:result", sync);
  sync();

  if (button) {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const done = new Set(readProgress());
      if (done.has(slug)) done.delete(slug);
      else done.add(slug);
      writeStore(STORE.progress, [...done]);
      paintProgress();
      sync();
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
  const passed = new Set(readPassed());
  const total = Number(document.body.dataset.lessonTotal || 0);

  document.querySelectorAll("[data-lesson-row]").forEach((row) => {
    const slug = row.getAttribute("data-lesson-row");
    const isDone = done.has(slug);
    const isPassed = passed.has(slug);
    row.dataset.done = isDone ? "true" : "false";
    row.dataset.passed = isPassed ? "true" : "false";
    const stateEl = row.querySelector("[data-state-for]");
    if (stateEl) {
      stateEl.textContent = isDone ? "Completed" : isPassed ? "Exercise passed" : "Not started";
      stateEl.style.color = isDone ? "var(--amber)" : isPassed ? "var(--muted)" : "";
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

/* ------------------------------------------------------------- boot */

function boot() {
  initTheme();
  initNav();
  initCopy();
  initCodeRunners();
  initHeroBench();
  initPlayground();
  initExercise();
  initExerciseGate();
  paintProgress();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
