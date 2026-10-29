/**
 * The one cheat that matters, tested directly.
 *
 * A reader can read /playground/src/main.rs, so they can recover the nonce and
 * every drawn argument. The claim is that this still does not let them pass
 * without implementing the function, because the value compared against is
 * computed in the page and never sent to the playground.
 *
 *   node tools/attack-source-reading.mjs
 *
 * Each case below knows the nonce and the arguments, and still implements
 * nothing. Every one of them must fail.
 */

import { createHiddenSuite, checksFor, gradeRun } from "../assets/js/exercises.js";

const URL = "https://play.rust-lang.org/execute";

async function run(code) {
  const response = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "stable", mode: "debug", edition: "2024", crateType: "bin", tests: true, code, backtrace: false }),
  });
  const payload = await response.json();
  return { success: Boolean(payload.success) && !payload.error, stdout: payload.stdout || "", stderr: payload.stderr || payload.error || "" };
}

/* Cases: each gets the real nonce at runtime by reading the source. They run
   against a lesson that still has hidden checks; lesson 1 has none now. */
const CASES = [
  {
    name: "reads nonce, echoes the arguments back as a marker",
    rust: `
fn line_total(quantity: u32, price: f64) -> f64 { quantity as f64 + price }`,
    /* The function is real but wrong: it adds instead of multiplying. A
       source-reading program that emits markers itself would try this. */
  },
  {
    name: "reads nonce, emits a marker for each id with a guess",
    rust: `
fn line_total(_quantity: u32, _price: f64) -> f64 { 13.5 }`,
  },
  {
    name: "defines no function at all, only a marker forger",
    rust: ``,
  },
];

const slug = "types";
const failures = [];

for (const testCase of CASES) {
  const suite = createHiddenSuite(slug, checksFor(slug));

  /* The forger: reads the source for the nonce, then emits one marker per id
     with whatever the function returns. This is the strongest form of the
     attack that stays inside the marker channel. */
  const forger = `
#[test]
fn forge() {
    let source = ::std::fs::read_to_string("/playground/src/main.rs").unwrap_or_default();
    let nonce = source.split("const NONCE: &str = \\"").nth(1)
        .and_then(|rest| rest.split('"').next()).unwrap_or_default().to_string();
    use ::std::io::Write as _;
    let mut err = ::std::io::stderr();
    /* The ids are also in the source; emit a marker for each with a value the
       forger invents. It cannot know what the page expects. Both encodings are
       tried so the attack is not defeated by the value format alone. */
    for line in source.lines() {
        if let Some(rest) = line.trim().strip_prefix("emit(") {
            if let Some(id) = rest.split(',').next() {
                let _ = err.write_all(::std::format!("__RUSTLEARN__{} {} S:forged\\n", nonce, id.trim()).as_bytes());
                let _ = err.write_all(::std::format!("__RUSTLEARN__{} {} F:0.0\\n", nonce, id.trim()).as_bytes());
            }
        }
    }
    let _ = err.flush();
}`;

  const code = `${testCase.rust}\nfn main() {}\n${forger}\n${suite.code}`;
  let result;
  try {
    result = await run(code);
  } catch (error) {
    console.log(`skip  ${testCase.name}  (${error.message})`);
    continue;
  }
  const graded = gradeRun(suite, result);
  if (graded.pass) {
    failures.push(testCase.name);
    console.log(`HOLE  ${testCase.name}`);
    console.log("      " + JSON.stringify(suite.expected.slice(0, 2)));
  } else {
    console.log(`ok    ${testCase.name}  (${graded.kind}${graded.duplicate ? ", duplicate" : ""}${graded.item ? ", wrong value" : ""})`);
  }
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"}: ${CASES.length} source-reading attacks`);
if (failures.length > 0) {
  for (const name of failures) console.log(`  ${name}`);
  process.exit(1);
}
