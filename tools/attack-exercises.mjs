/**
 * Independent attack suite against the exercise grader.
 *
 * verify-exercises.mjs tests the cheats its author thought of. This tries
 * cheats aimed at the marker channel itself, since that is the one place
 * where the reader's code and the grader meet.
 *
 *   node tools/attack-exercises.mjs
 *
 * Each case is a program that does NOT implement the exercise correctly. The
 * question is only whether it can still be graded as a pass. A case that
 * passes is a hole.
 *
 * The base for every attack is the starter code, not the solution: appending
 * an attack to a correct solution would pass on merit and prove nothing.
 */

import { createHiddenSuite, checksFor, gradeRun } from "../assets/js/exercises.js";
import { lessons } from "../content/lessons.mjs";

const URL = "https://play.rust-lang.org/execute";

async function run(code, tests = true) {
  const response = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "stable", mode: "debug", edition: "2024", crateType: "bin", tests, code, backtrace: false }),
  });
  if (!response.ok) throw new Error(`playground answered ${response.status}`);
  const payload = await response.json();
  return {
    success: Boolean(payload.success) && !payload.error,
    stdout: payload.stdout || "",
    stderr: payload.stderr || payload.error || "",
  };
}

/* Attacks that run on top of the starter, so the functions are missing or
   wrong and every check would fail on its own. */
const ATTACKS = [
  {
    name: "reads the runner's source to find the nonce",
    code: `
#[test]
fn read_sources() {
    let source = ::std::fs::read_to_string("/playground/src/main.rs").unwrap_or_default();
    use ::std::io::Write as _;
    let mut err = ::std::io::stderr();
    let _ = err.write_all(::std::format!("SOURCELEN:{}\\n", source.len()).as_bytes());
    let _ = err.flush();
}`,
  },
  {
    name: "sprays wildcard markers at ids 1..=400",
    code: `
#[test]
fn spray() {
    use ::std::io::Write as _;
    let mut err = ::std::io::stderr();
    for index in 1..=400 {
        for value in ["S:any", "F:0", "U:0", "I:0", "V:[]", "T:0,0", "R:Ok:0"] {
            let _ = err.write_all(::std::format!("__RUSTLEARN__x {} {}\\n", index, value).as_bytes());
        }
    }
    let _ = err.flush();
}`,
  },
  {
    name: "declares a top-level emit() to intercept the marker call",
    code: `
fn emit(index: usize, value: String) {
    use ::std::io::Write as _;
    let mut err = ::std::io::stderr();
    let _ = err.write_all(::std::format!("__RUSTLEARN__SHADOW {} {}\\n", index, value).as_bytes());
    let _ = err.flush();
}`,
  },
  {
    name: "forges a summary line and exits 0",
    code: `
#[test]
fn forged() {
    use ::std::io::Write as _;
    let mut out = ::std::io::stdout();
    let _ = out.write_all(b"\\ntest result: ok. 999 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\\n");
    let _ = out.flush();
    ::std::process::exit(0);
}`,
  },
  {
    name: "shadows the hidden module name with a macro of the same shape",
    code: `
macro_rules! hidden_check_ { () => {}; }`,
  },
  {
    name: "sprays markers on stdout to duplicate the channel",
    code: `
#[test]
fn stdout_spray() {
    for index in 1..=400 {
        println!("__RUSTLEARN__x {} S:any", index);
    }
}`,
  },
  {
    name: "writes markers through a raw fd to defeat capture",
    code: `
#[test]
fn raw_fd() {
    #[cfg(unix)]
    {
        use ::std::io::Write as _;
        let mut out = unsafe { <::std::fs::File as ::std::os::fd::FromRawFd>::from_raw_fd(2) };
        for index in 1..=400 {
            let _ = out.write_all(::std::format!("__RUSTLEARN__x {} S:any\\n", index).as_bytes());
        }
        let _ = out.flush();
        ::std::mem::forget(out);
    }
}`,
  },
];

const holes = [];
const rejected = [];
let attempted = 0;

for (const lesson of lessons) {
  const { slug, exercise } = lesson;

  /* Lesson 1 has no function checks, so there is no marker channel to attack.
     It is graded on output plus a source check for the `{}` slots and a hidden
     run that requires a two-slot call to execute and produce the expected
     second line. Everything below needs a hidden suite of function checks. */
  if (checksFor(slug).length === 0) {
    console.log(`skip  ${slug}  no marker channel to attack`);
    continue;
  }

  const base = exercise.starter || "fn main() {}";

  for (const attack of ATTACKS) {
    attempted += 1;
    const suite = createHiddenSuite(slug, checksFor(slug));
    let result;
    try {
      result = await run(`${base}\n${attack.code}\n${suite.code}`);
    } catch (error) {
      console.log(`skip  ${slug}  ${attack.name}  (${error.message})`);
      continue;
    }
    const graded = gradeRun(suite, result, { ownTests: exercise.ownTests || 0 });
    if (graded.pass) {
      holes.push({ slug, attack: attack.name });
      console.log(`HOLE  ${slug}  ${attack.name}`);
    } else {
      rejected.push(graded.kind);
    }
  }
}

const kinds = rejected.reduce((all, kind) => ({ ...all, [kind]: (all[kind] || 0) + 1 }), {});
console.log(`\nrejected by reason: ${JSON.stringify(kinds)}`);
console.log(`${holes.length === 0 ? "PASS" : "FAIL"}: ${attempted} attacks, ${holes.length} holes`);
if (holes.length > 0) {
  for (const hole of holes) console.log(`  ${hole.slug}: ${hole.attack}`);
  process.exit(1);
}
