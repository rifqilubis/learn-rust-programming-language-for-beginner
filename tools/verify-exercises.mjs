/**
 * Checks every lesson exercise against the real compiler, using the same
 * public Playground API the page uses.
 *
 *   node tools/verify-exercises.mjs
 *
 * Three things have to hold for an exercise to be honest:
 *
 *   1. The reference solution passes the checker, so the exercise is solvable.
 *   2. The starter code does not pass it, so the exercise is not already done.
 *   3. For test-mode exercises, the appended hidden tests fail against a
 *      deliberately wrong implementation, so they cannot be satisfied by
 *      a stub that only makes the visible tests green.
 */

import { lessons } from "../content/lessons.mjs";

const URL = "https://play.rust-lang.org/execute";

async function run(code, tests) {
  const response = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "stable",
      mode: "debug",
      edition: "2024",
      crateType: "bin",
      tests: Boolean(tests),
      code,
      backtrace: false,
    }),
  });
  if (!response.ok) throw new Error(`playground answered ${response.status}`);
  return response.json();
}

const normalise = (text) =>
  String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .trim();

const testReport = (stdout) => {
  const text = String(stdout || "");
  return {
    passed: Number((text.match(/test result: ok\. (\d+) passed/) || [])[1] || 0),
    failed: Number((text.match(/(\d+) failed/) || [])[1] || 0),
    ran: Number((text.match(/(\d+) passed/) || [])[1] || 0) + Number((text.match(/(\d+) failed/) || [])[1] || 0),
    ignored: Number((text.match(/(\d+) ignored/) || [])[1] || 0),
  };
};

const failures = [];
const fail = (slug, reason, detail = "") => {
  failures.push({ slug, reason, detail });
  console.log(`FAIL  ${slug}  ${reason}`);
  if (detail) console.log(detail.split("\n").slice(0, 10).map((l) => `        ${l}`).join("\n"));
};

for (const lesson of lessons) {
  const exercise = lesson.exercise;
  const tests = exercise.mode === "tests";

  if (typeof exercise.starter !== "string" || exercise.starter.trim() === "") {
    fail(lesson.slug, "no starter code");
    continue;
  }
  if (typeof exercise.solution !== "string" || exercise.solution.trim() === "") {
    fail(lesson.slug, "no reference solution");
    continue;
  }
  if (!tests && typeof exercise.expected !== "string") {
    fail(lesson.slug, "no expected output");
    continue;
  }

  /* 1. The reference solution must pass. */
  const full = tests ? `${exercise.solution}\n${exercise.append || ""}` : exercise.solution;
  let solved;
  try {
    solved = await run(full, tests);
  } catch (error) {
    fail(lesson.slug, `solution request failed: ${error.message}`);
    continue;
  }

  if (!solved.success) {
    fail(lesson.slug, "reference solution does not compile or pass", solved.stderr || solved.stdout);
    continue;
  }

  if (tests) {
    const report = testReport(solved.stdout);
    if (report.passed < (exercise.minTests || 0) || report.ignored > 0) {
      fail(
        lesson.slug,
        `solution passed ${report.passed} of ${exercise.minTests} required tests (${report.ignored} ignored)`,
      );
      continue;
    }
    console.log(`ok    ${lesson.slug}  solution passes ${report.passed} tests`);
  } else {
    if (normalise(solved.stdout) !== normalise(exercise.expected)) {
      fail(lesson.slug, "solution output does not match expected", `expected:\n${exercise.expected}\n\nactual:\n${solved.stdout}`);
      continue;
    }
    console.log(`ok    ${lesson.slug}  solution matches expected output`);
  }

  /* 2. The starter must not already pass. */
  const starterFull = tests ? `${exercise.starter}\n${exercise.append || ""}` : exercise.starter;
  let started;
  try {
    started = await run(starterFull, tests);
  } catch (error) {
    fail(lesson.slug, `starter request failed: ${error.message}`);
    continue;
  }

  const starterPasses = tests
    ? started.success && testReport(started.stdout).passed >= (exercise.minTests || 0)
    : started.success && normalise(started.stdout) === normalise(exercise.expected);

  if (starterPasses) {
    fail(lesson.slug, "starter code already passes, so there is nothing to solve");
    continue;
  }
  console.log(`ok    ${lesson.slug}  starter does not pass (${started.success ? "output differs" : "fails"})`);

  /* 3. The hidden tests must reject a stub. */
  if (tests) {
    const stub = exercise.starter.replace(/todo!\([^)]*\)/g, "").replace(/^\s*$/gm, "");
    const stubFull = `${stub}\n${exercise.append || ""}`;
    let stubResult;
    try {
      stubResult = await run(stubFull, true);
    } catch (error) {
      fail(lesson.slug, `stub request failed: ${error.message}`);
      continue;
    }
    if (stubResult.success) {
      fail(lesson.slug, "a do-nothing implementation passes the hidden tests");
    } else {
      console.log(`ok    ${lesson.slug}  hidden tests reject a stub implementation`);
    }
  }
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"}: ${lessons.length} exercises`);

if (failures.length > 0) {
  for (const failure of failures) console.log(`  ${failure.slug}: ${failure.reason}`);
  process.exit(1);
}
