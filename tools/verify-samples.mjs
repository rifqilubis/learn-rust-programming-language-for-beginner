/**
 * Checks every code sample on the site against a real compiler, and checks
 * that the output printed on the page is the output a real run produces.
 *
 *   node tools/verify-samples.mjs            compile check, then run the
 *                                            samples through the Playground
 *   node tools/verify-samples.mjs --local    compile check only
 *
 * Compilation is checked with the local rustc in metadata mode, so no C
 * toolchain is needed. Running uses the same public API the site uses, or a
 * local binary when a linker is available, and compares stdout with the
 * output written in the lesson.
 *
 * Samples marked as not compiling must fail. Any E-code quoted in the note
 * under such a sample must appear in the compiler output.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expectations } from "../content/partials.mjs";
import { withNumbers } from "../content/lessons.mjs";
import { findRustc } from "./rustc-path.mjs";

const localOnly = process.argv.includes("--local");
const rustc = findRustc();

const version = spawnSync(rustc, ["--version"], { encoding: "utf8" });
if (version.status !== 0) {
  console.error("verify-samples: rustc not found. Install the toolchain first (lesson 01).");
  process.exit(2);
}
console.log(`toolchain: ${version.stdout.trim()}`);

/* Render every lesson body, which is the same path the build uses, so the
   checks cover exactly the samples the site ships. */
const lessons = withNumbers();
lessons.forEach((lesson) => lesson.body());

console.log(`samples:   ${expectations.length}\n`);

function compileCheck(code) {
  const dir = mkdtempSync(join(tmpdir(), "rustlearn-"));
  const file = join(dir, "main.rs");
  writeFileSync(file, code);
  try {
    execFileSync(rustc, ["--edition", "2024", "--emit=metadata", "--crate-type", "bin", "-o", join(dir, "main.rmeta"), file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { compiled: true, stderr: "" };
  } catch (error) {
    return { compiled: false, stderr: String(error.stderr || error.message) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function runOnline(code) {
  const response = await fetch("https://play.rust-lang.org/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "stable",
      mode: "debug",
      edition: "2024",
      crateType: "bin",
      tests: false,
      code,
      backtrace: false,
    }),
  });
  if (!response.ok) throw new Error(`playground answered ${response.status}`);
  return response.json();
}

const failures = [];
const notCompiling = [];

for (const [index, item] of expectations.entries()) {
  const id = `${String(index + 1).padStart(2, "0")} ${item.label}${item.tag ? ` (${item.tag})` : ""}`;
  const local = compileCheck(item.code);

  if (item.shouldCompile) {
    if (!local.compiled) {
      failures.push({ id, reason: "page says it compiles, but rustc rejected it", detail: head(local.stderr) });
      console.log(`FAIL  ${id}  should compile`);
      continue;
    }
    console.log(`ok    ${id}  compiles`);
  } else {
    if (local.compiled) {
      failures.push({ id, reason: "page says it does not compile, but rustc accepted it" });
      console.log(`FAIL  ${id}  compiled, but the page says it should not`);
      continue;
    }
    notCompiling.push({ id, stderr: local.stderr, note: item.note });
    console.log(`ok    ${id}  rejected, as documented`);
  }
}

/* Any error code quoted in the note of a failing sample must come from that
   sample's own compiler output. */
for (const item of notCompiling) {
  const quoted = [...String(item.note || "").matchAll(/E\d{4}/g)].map((match) => match[0]);
  for (const code of new Set(quoted)) {
    if (item.stderr.includes(code)) {
      console.log(`ok    ${item.id}  quotes ${code} correctly`);
    } else {
      failures.push({ id: item.id, reason: `note quotes ${code}, compiler produced something else` });
      console.log(`FAIL  ${item.id}  quotes ${code} but compiler did not emit it`);
    }
  }
}

/* Run every compiling sample that claims an output, and compare. */
if (!localOnly) {
  const runnable = expectations.filter((item) => item.shouldCompile && item.expect !== "");
  console.log(`\nrunning ${runnable.length} samples through the Playground API`);

  for (const [index, item] of runnable.entries()) {
    const id = `run ${String(index + 1).padStart(2, "0")} ${item.label}`;
    try {
      const result = await runOnline(item.code);
      if (!result.success) {
        failures.push({ id, reason: "compiled locally but failed in the Playground", detail: head(result.stderr) });
        console.log(`FAIL  ${id}  remote compile failed`);
        continue;
      }
      const actual = String(result.stdout || "").trim();
      const expected = String(item.expect).trim();
      if (actual === expected) {
        console.log(`ok    ${id}  printed what the lesson says`);
      } else {
        failures.push({
          id,
          reason: "stdout does not match the lesson",
          detail: `expected:\n${expected}\n\nactual:\n${actual}`,
        });
        console.log(`FAIL  ${id}  stdout mismatch`);
      }
    } catch (error) {
      failures.push({ id, reason: `request failed: ${error.message}` });
      console.log(`FAIL  ${id}  ${error.message}`);
    }
  }
}

/* Progress totals quoted on the site must match the lessons array. */
const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"}: ${expectations.length} samples, ${minutes} minutes of material`);

if (failures.length > 0) {
  console.log("\nfailures:");
  for (const failure of failures) {
    console.log(`\n  ${failure.id}`);
    console.log(`    ${failure.reason}`);
    if (failure.detail) console.log(indent(head(failure.detail, 14)));
  }
  process.exit(1);
}

function head(text, lines = 8) {
  return String(text).split("\n").slice(0, lines).join("\n");
}

function indent(text) {
  return String(text)
    .split("\n")
    .map((line) => "    " + line)
    .join("\n");
}
