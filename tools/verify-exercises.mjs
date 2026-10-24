/**
 * Proves the exercise checker cannot be satisfied without doing the work.
 *
 *   node tools/verify-exercises.mjs            full check, uses the Playground
 *   node tools/verify-exercises.mjs --local    compile checks only
 *
 * For every lesson it checks, against the real compiler and the real
 * Playground:
 *
 *   1. the reference solution compiles, passes every hidden check, and prints
 *      the expected output;
 *   2. the starter code does not pass;
 *   3. printing the expected output, with no functions, does not pass
 *      (this is the cheat that was reported);
 *   4. a hard-coded implementation that returns the right answer for the
 *      example in the exercise, but nothing else, does not pass;
 *   5. a program that stops the test harness early does not pass;
 *   6. a program that forges a passing summary line does not pass;
 *   7. a program that prints forged marker lines does not pass;
 *   8. the reader's own tests are required in the lesson that asks for them,
 *      and are rejected when they cannot fail.
 *
 * The hidden checks draw random arguments and a fresh nonce on every run, so
 * every run is a new exam. This file imports the same module the page uses.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createHiddenSuite,
  checksFor,
  gradeRun,
  gradeSubmission,
  countFailedTests,
  mutantSources,
  looksLikeCompileError,
} from "../assets/js/exercises.js";
import { lessons } from "../content/lessons.mjs";

const localOnly = process.argv.includes("--local");
const rustc = join(process.env.CARGO_HOME || join(process.env.HOME || "", ".cargo"), "bin", "rustc");
const version = spawnSync(rustc, ["--version"], { encoding: "utf8" });
if (version.status !== 0) {
  console.error("verify-exercises: rustc not found. Install the toolchain first (lesson 01).");
  process.exit(2);
}
console.log(`toolchain: ${version.stdout.trim()}`);

const URL = "https://play.rust-lang.org/execute";

async function run(code, tests = true) {
  const response = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "stable",
      mode: "debug",
      edition: "2024",
      crateType: "bin",
      tests,
      code,
      backtrace: false,
    }),
  });
  if (!response.ok) throw new Error(`playground answered ${response.status}`);
  const payload = await response.json();
  return {
    success: Boolean(payload.success) && !payload.error,
    stdout: payload.stdout || "",
    stderr: payload.stderr || payload.error || "",
  };
}

function compileCheck(code) {
  const dir = mkdtempSync(join(tmpdir(), "rustlearn-ex-"));
  const file = join(dir, "main.rs");
  writeFileSync(file, code);
  try {
    const result = spawnSync(
      rustc,
      ["--edition", "2024", "--test", "--emit=metadata", "-o", join(dir, "main.rmeta"), file],
      { encoding: "utf8" },
    );
    return { ok: result.status === 0, stderr: result.stderr || "" };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function normalise(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .trim();
}

/* A program that prints the expected output and defines nothing. This is the
   exact cheat that was reported: it passed the old stdout-only checker. */
function printOnly(exercise) {
  const lines = String(exercise.expected || "")
    .split("\n")
    .filter((line) => line !== "");
  if (lines.length === 0) return "fn main() {}";
  return `fn main() {\n${lines.map((line) => `    println!(${JSON.stringify(line)});`).join("\n")}\n}`;
}

/* A function that returns the right answer for the example only. */
const HARDCODED = {
  "install-and-first-program": `fn main() { println!("Hello from Rust!"); println!("{}", year_line(2026)); }
fn year_line(_year: u32) -> String { String::from("Learning Rust in 2026") }`,
  "variables-and-mutability": `fn main() {}
fn total(_price: f64, _quantity: u32) -> f64 { 50.0 }
fn discounted(_price: f64, _quantity: u32) -> f64 { 45.0 }`,
  types: `fn main() {}
fn line_total(_quantity: u32, _price: f64) -> f64 { 13.5 }`,
  functions: `fn main() {}
fn celsius_to_fahrenheit(_c: f64) -> f64 { 32.0 }
fn min_max(_a: i32, _b: i32) -> (i32, i32) { (3, 9) }`,
  "conditionals-and-loops": `fn main() {}
fn fizzbuzz(n: u32) -> String { if n % 15 == 0 { String::from("fizzbuzz") } else { n.to_string() } }`,
  ownership: `fn main() {}
fn shout(text: String) -> String { if text == "hello" { String::from("hello!!") } else { text } }`,
  borrowing: `fn main() {}
fn longest<'a>(_a: &'a str, _b: &'a str) -> &'a str { "ferris" }`,
  structs: `fn main() {}
struct Book { pub title: String, pub author: String, pub pages: u32 }
impl Book {
    fn new(_title: &str, _author: &str, _pages: u32) -> Book {
        Book { title: String::from("The Hobbit"), author: String::from("Tolkien"), pages: 310 }
    }
    fn reading_time(&self) -> f64 { 155.0 }
}`,
  "enums-and-match": `fn main() {}
#[derive(Copy, Clone)]
enum TrafficLight { Red, Green, Yellow }
impl TrafficLight {
    fn next(self) -> TrafficLight { TrafficLight::Green }
    fn name(self) -> &'static str { "red" }
}`,
  collections: `fn main() {}
fn evens(_numbers: &[i32]) -> Vec<i32> { vec![4, 8, 16, 42] }
fn even_sum(_numbers: &[i32]) -> i32 { 70 }`,
  errors: `fn main() {}
fn average(_numbers: &[i32]) -> Result<f64, String> { Ok(5.0) }`,
  "modules-and-tests": `fn word_count(_text: &str) -> usize { 3 }
fn main() {}`,
};

/* Stops the harness before the hidden tests report, then exits 0. */
const EARLY_EXIT = `
#[test]
fn reader_stops_everything() {
    ::std::process::exit(0);
}`;

/* Prints a forged summary through the real stdout, then stops the harness. */
const FORGED_SUMMARY = `
#[test]
fn reader_forges_the_summary() {
    use ::std::io::Write as _;
    let mut out = ::std::io::stdout();
    let _ = out.write_all(b"\\ntest result: ok. 99 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out\\n\\n");
    let _ = out.flush();
    ::std::process::exit(0);
}`;

/* Reads the nonce out of its own source, then prints a marker line claiming
   every check passed. This is the most direct attack on the marker channel. */
const FORGED_MARKERS = `
#[test]
fn reader_forges_markers() {
    let source = ::std::fs::read_to_string("/playground/src/main.rs").unwrap_or_default();
    let nonce = source
        .split("const NONCE: &str = \\"")
        .nth(1)
        .and_then(|rest| rest.split('"').next())
        .unwrap_or_default()
        .to_string();
    use ::std::io::Write as _;
    let mut out = ::std::io::stdout();
    for index in 1..=64 {
        let _ = out.write_all(::std::format!("__RUSTLEARN__{} {} S:any\\n", nonce, index).as_bytes());
    }
    let _ = out.flush();
    ::std::process::exit(0);
}`;

const failures = [];
function fail(slug, reason, detail = "") {
  failures.push({ slug, reason });
  console.log(`FAIL  ${slug}  ${reason}`);
  if (detail) {
    console.log(
      String(detail)
        .split("\n")
        .slice(0, 8)
        .map((line) => `        ${line}`)
        .join("\n"),
    );
  }
}

/* The same judgement the page makes. */
function judge(suite, result, options = {}) {
  const graded = gradeRun(suite, result, options);
  if (graded.pass) return { pass: true, why: `${graded.count} hidden checks passed` };
  if (graded.kind === "compile") return { pass: false, why: "did not compile" };
  if (graded.kind === "own-tests") return { pass: false, why: "own tests missing" };
  if (graded.missing) return { pass: false, why: "a check never reported" };
  if (graded.duplicate) return { pass: false, why: "a check reported twice" };
  if (graded.unexpected) return { pass: false, why: "an unrequested check reported" };
  if (graded.item) return { pass: false, why: "a check returned the wrong value" };
  return { pass: false, why: "the run did not pass" };
}

/* Run a candidate against a fresh suite, exactly as the page would. */
async function attempt(slug, code, options = {}) {
  const suite = createHiddenSuite(slug, checksFor(slug));
  const result = await run(`${code}\n${suite.code}`);
  return { verdict: judge(suite, result, options), result, suite };
}

console.log(`exercises: ${lessons.length}\n`);

for (const lesson of lessons) {
  const { slug, exercise } = lesson;
  const checks = checksFor(slug);

  if (!Array.isArray(checks) || checks.length === 0) {
    fail(slug, "no hidden checks are configured");
    continue;
  }
  if (typeof exercise.solution !== "string" || exercise.solution.trim() === "") {
    fail(slug, "no reference solution");
    continue;
  }
  if (
    !Array.isArray(exercise.tips) ||
    exercise.tips.length < 3 ||
    exercise.tips.some((tip) => typeof tip !== "string" || tip.trim() === "")
  ) {
    fail(slug, "the exercise needs at least three beginner tips");
    continue;
  }

  /* 1. The solution must compile and pass every hidden check. */
  const suite = createHiddenSuite(slug, checks);
  const compiled = compileCheck(`${exercise.solution}\n${suite.code}`);
  if (!compiled.ok) {
    fail(slug, "reference solution does not compile with the hidden checks", compiled.stderr);
    continue;
  }
  console.log(`ok    ${slug}  solution compiles with ${suite.count} hidden checks`);

  if (localOnly) continue;

  let solved;
  try {
    solved = await run(`${exercise.solution}\n${suite.code}`);
  } catch (error) {
    fail(slug, `solution request failed: ${error.message}`);
    continue;
  }
  const verdict = judge(suite, solved, { ownTests: exercise.ownTests || 0 });
  if (!verdict.pass) {
    fail(slug, `reference solution does not pass (${verdict.why})`, solved.stdout || solved.stderr);
    continue;
  }
  console.log(`ok    ${slug}  ${verdict.why}`);

  /* 1b. The solution must still print what the exercise asked for. */
  if (normalise(exercise.expected) !== "") {
    const output = await run(exercise.solution, false);
    if (!output.success || normalise(output.stdout) !== normalise(exercise.expected)) {
      fail(slug, "reference solution does not print the expected output", output.stdout || output.stderr);
      continue;
    }
    console.log("ok    solution prints the expected output");
  }

  /* 2. The starter must not pass. */
  const starter = await attempt(slug, exercise.starter);
  if (starter.verdict.pass) {
    fail(slug, "starter code already passes, so there is nothing to solve");
    continue;
  }
  console.log(`ok    ${slug}  starter does not pass (${starter.verdict.why})`);

  /* 3. Printing the expected output, with no functions, must not pass. */
  const cheat = await attempt(slug, printOnly(exercise));
  if (cheat.verdict.pass) {
    fail(slug, "printing the expected output passes the checker");
    continue;
  }
  console.log(`ok    ${slug}  printing the expected output does not pass (${cheat.verdict.why})`);

  /* 4. A function hard-coded to the example must not pass. */
  if (HARDCODED[slug]) {
    const hard = await attempt(slug, HARDCODED[slug]);
    if (hard.verdict.pass) {
      fail(slug, "a hard-coded function that only answers the example passes");
      continue;
    }
    console.log(`ok    ${slug}  a hard-coded function does not pass (${hard.verdict.why})`);
  }

  /* 5. Stopping the harness early must not pass. */
  const early = await attempt(slug, `${exercise.solution}${EARLY_EXIT}`);
  if (early.verdict.pass) {
    fail(slug, "process::exit(0) in a reader test is accepted as a pass");
    continue;
  }
  console.log(`ok    ${slug}  stopping the harness early does not pass (${early.verdict.why})`);

  /* 6. Forging a summary line must not pass. */
  const forged = await attempt(slug, `${exercise.solution}${FORGED_SUMMARY}`);
  if (forged.verdict.pass) {
    fail(slug, "a forged test summary is accepted as a pass");
    continue;
  }
  console.log(`ok    ${slug}  a forged summary does not pass (${forged.verdict.why})`);

  /* 7. Forging marker lines must not pass. */
  const markers = await attempt(slug, `${exercise.solution}${FORGED_MARKERS}`);
  if (markers.verdict.pass) {
    fail(slug, "forged marker lines are accepted as a pass");
    continue;
  }
  console.log(`ok    ${slug}  forged marker lines do not pass (${markers.verdict.why})`);

  /* 8. The lesson that asks for tests must require the reader's own tests,
        and must reject tests that cannot fail. */
  if (exercise.ownTests > 0) {
    const withoutOwn = exercise.solution.replace(/#\[cfg\(test\)\][\s\S]*$/, "");
    const stripped = await attempt(slug, withoutOwn, { ownTests: exercise.ownTests });
    if (stripped.verdict.pass) {
      fail(slug, "deleting the reader's own tests still passes");
      continue;
    }
    console.log(`ok    ${slug}  the reader's own tests are required (${stripped.verdict.why})`);

    /* Tests that cannot fail are common: empty bodies, assert!(true), or a
       test that only checks the function runs. Two different broken
       implementations have to break all of the reader's tests. */
    const broken = mutantSources(exercise.solution);
    if (broken.length === 0) {
      fail(slug, "could not build a mutant of the reader's word_count");
      continue;
    }
    const runs = await Promise.all(broken.map((source) => run(source)));
    const caught = runs.some((result) => countFailedTests(result.stdout) >= exercise.ownTests);
    if (!caught) {
      fail(slug, "the reader's own tests still pass against a deliberately broken word_count");
      continue;
    }
    console.log(`ok    ${slug}  the reader's own tests catch a broken word_count`);

    /* A pointless suite must not be enough for a pass. */
    const fake = `fn word_count(text: &str) -> usize { text.split_whitespace().count() }
fn main() {}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn a() {}
    #[test] fn b() { assert!(true); }
    #[test] fn c() { assert_eq!(word_count("   "), 0); }
}`;
    const fakeSuite = createHiddenSuite(slug, checksFor(slug));
    const fakeRun = await run(`${fake}\n${fakeSuite.code}`);
    const fakeVerdict = await gradeSubmission({
      code: fake,
      suite: fakeSuite,
      result: fakeRun,
      ownTests: exercise.ownTests,
      runTests: (source) => run(source),
    });
    if (fakeVerdict.pass) {
      fail(slug, "a suite of empty and assert!(true) tests passes the lesson");
      continue;
    }
    console.log(`ok    ${slug}  a suite of empty tests does not pass (${fakeVerdict.kind})`);
  }
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"}: ${lessons.length} exercises`);

if (failures.length > 0) {
  for (const failure of failures) console.log(`  ${failure.slug}: ${failure.reason}`);
  process.exit(1);
}
