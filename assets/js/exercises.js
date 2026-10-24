/**
 * Behaviour checks for the lesson exercises.
 *
 * Shared by the page (assets/js/site.js) and the verifier
 * (tools/verify-exercises.mjs), so what a reader is graded on is exactly what
 * the verifier tests.
 *
 * Why this is not a stdout comparison: printing the expected text used to
 * pass. So the page now does this instead.
 *
 *   1. It draws the arguments for each check when the reader presses Check.
 *   2. It appends a hidden `#[cfg(test)]` module that calls the reader's
 *      functions with those arguments and writes each result through a
 *      private marker channel (`__RUSTLEARN__<nonce> <id> <value>`).
 *   3. It compares each returned value with a value it computed itself.
 *
 * The expected values never leave this module, so a program cannot read them
 * out of its own source. To produce a matching marker line it has to compute
 * the answer. Printing the exercise's expected output produces no marker
 * lines at all, and forging a test summary produces none either.
 *
 * The marker channel writes straight to stdout rather than through `print!`,
 * because the test harness captures `print!` output from passing tests.
 *
 * A check is:
 *
 *   { args: { n: { u32: [1, 5000] } }, repeats: 3,
 *     probes: [{ rust: '::std::format!("S:{}", f(n))' }],
 *     expect: (args, probe) => "S:..." }
 *
 * Arguments are bound as Rust variables with the same names the probe uses.
 * Paths in the Rust are fully qualified (`::std::...`) so a reader-defined
 * type, trait, or macro named `String`, `format`, or `assert_eq` cannot
 * neutralise a check.
 */

const WORDS = [
  "ferris",
  "crab",
  "claw",
  "shell",
  "rust",
  "cargo",
  "bench",
  "gauge",
  "spanner",
  "oxide",
  "copper",
  "lathe",
  "vise",
  "solder",
  "anvil",
  "ratchet",
];

const MARKER = "__RUSTLEARN__";

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/* Turn one argument spec into a Rust literal, the type it binds to, and the
   JavaScript value used to compute the expected result. */
function literal(spec) {
  if (spec.u32) {
    const [min, max] = spec.u32;
    const value = randomInt(min, max);
    return { type: "u32", text: String(value), value };
  }
  if (spec.i32) {
    const [min, max] = spec.i32;
    const value = randomInt(min, max);
    return { type: "i32", text: String(value), value };
  }
  if (spec.f64) {
    const [min, max] = spec.f64;
    const text = (randomInt(Math.round(min * 100), Math.round(max * 100)) / 100).toFixed(2);
    /* Parse the literal text so the JavaScript value is the same double the
       Rust compiler reads. */
    return { type: "f64", text, value: Number(text) };
  }
  if (spec.str) {
    const value = pick(WORDS);
    return { type: "&str", text: JSON.stringify(value), value };
  }
  if (spec.sentence) {
    const [min, max] = spec.sentence;
    const count = randomInt(min, max);
    const value = Array.from({ length: count }, () => pick(WORDS)).join(" ");
    return { type: "&str", text: JSON.stringify(value), value };
  }
  if (spec.vec) {
    const { len, min, max } = spec.vec;
    const count = randomInt(len[0], len[1]);
    const value = Array.from({ length: count }, () => randomInt(min, max));
    return { type: "::std::vec::Vec<i32>", text: `::std::vec![${value.join(", ")}]`, value };
  }
  throw new Error(`unknown argument spec: ${JSON.stringify(spec)}`);
}

/* A short description of the inputs, so a failure message can name the call
   that went wrong without revealing the answer. */
function describeArgs(args) {
  const parts = Object.entries(args).map(([name, value]) => `${name} = ${JSON.stringify(value.value)}`);
  return parts.length ? parts.join(", ") : "no arguments";
}

/* ------------------------------------------------------------ encodings */
/*
 * Every value the reader's functions return is written as one line:
 *
 *   S:text        a string
 *   F:number      an f64, printed with {:?}
 *   I:number      an i32
 *   U:number      a u32 or usize
 *   T:a,b         a pair
 *   V:[a, b]      a Vec<i32>, in debug form
 *   R:Ok:number   a Result::Ok holding an f64
 *   R:Err:text    a Result::Err holding a string
 */

/** Compare two encoded results. Floats get a relative tolerance so a
 *  different-but-correct order of arithmetic is not called a failure. */
export function sameEncoded(got, want) {
  if (got === want) return true;
  const read = (text) => {
    if (text.startsWith("F:")) return Number(text.slice(2));
    if (text.startsWith("R:Ok:")) return Number(text.slice(5));
    return null;
  };
  const a = read(got);
  const b = read(want);
  if (a === null || b === null) return false;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
}

/* Exact function and method types. A probe compares the text a function
   returns, which would also accept a custom type whose Display says the right
   thing, so the hidden module pins the signature first. */
export const SIGNATURES = {
  "install-and-first-program": ["let _: fn(u32) -> ::std::string::String = year_line;"],
  "variables-and-mutability": [
    "let _: fn(f64, u32) -> f64 = total;",
    "let _: fn(f64, u32) -> f64 = discounted;",
  ],
  types: ["let _: fn(u32, f64) -> f64 = line_total;"],
  functions: [
    "let _: fn(f64) -> f64 = celsius_to_fahrenheit;",
    "let _: fn(i32, i32) -> (i32, i32) = min_max;",
  ],
  "conditionals-and-loops": ["let _: fn(u32) -> ::std::string::String = fizzbuzz;"],
  ownership: ["let _: fn(::std::string::String) -> ::std::string::String = shout;"],
  borrowing: ["let _: for<'a> fn(&'a str, &'a str) -> &'a str = longest;"],
  structs: [
    "let _: fn(&str, &str, u32) -> Book = Book::new;",
    "let _: fn(&Book) -> f64 = Book::reading_time;",
    "fn title_is_text(book: &Book) -> &str { &book.title }",
    "fn author_is_text(book: &Book) -> &str { &book.author }",
    "fn pages_is_integer(book: &Book) -> u32 { book.pages }",
    "let _ = (title_is_text, author_is_text, pages_is_integer);",
  ],
  "enums-and-match": [
    "let _: fn(TrafficLight) -> TrafficLight = TrafficLight::next;",
    "let _: fn(TrafficLight) -> &'static str = TrafficLight::name;",
  ],
  collections: [
    "let _: fn(&[i32]) -> ::std::vec::Vec<i32> = evens;",
    "let _: fn(&[i32]) -> i32 = even_sum;",
  ],
  errors: ["let _: fn(&[i32]) -> ::std::result::Result<f64, ::std::string::String> = average;"],
  "modules-and-tests": ["let _: fn(&str) -> usize = word_count;"],
};

/* ------------------------------------------------------------- checks */

function fizzbuzzValue(n) {
  if (n % 15 === 0) return "fizzbuzz";
  if (n % 3 === 0) return "fizz";
  if (n % 5 === 0) return "buzz";
  return String(n);
}

const ERR_MATCH = `match average(&numbers) {
    ::std::result::Result::Ok(value) => ::std::format!("R:Ok:{:?}", value),
    ::std::result::Result::Err(error) => ::std::format!("R:Err:{}", error),
}`;

export const CHECKS = {
  "install-and-first-program": [
    {
      args: { year: { u32: [1900, 2100] } },
      repeats: 3,
      probes: [{ rust: '::std::format!("S:{}", year_line(year))' }],
      expect: (a) => `S:Learning Rust in ${a.year.value}`,
    },
  ],

  "variables-and-mutability": [
    {
      args: { price: { f64: [1, 500] }, quantity: { u32: [1, 50] } },
      repeats: 3,
      probes: [
        { rust: '::std::format!("F:{:?}", total(price, quantity))' },
        { rust: '::std::format!("F:{:?}", discounted(price, quantity))' },
      ],
      expect: (a, probe) =>
        probe.rust.includes("discounted")
          ? `F:${a.price.value * 0.9 * a.quantity.value}`
          : `F:${a.price.value * a.quantity.value}`,
    },
  ],

  types: [
    {
      args: { quantity: { u32: [1, 40] }, price: { f64: [0.5, 250] } },
      repeats: 3,
      probes: [{ rust: '::std::format!("F:{:?}", line_total(quantity, price))' }],
      expect: (a) => `F:${a.quantity.value * a.price.value}`,
    },
  ],

  functions: [
    {
      args: { c: { f64: [-100, 100] } },
      repeats: 3,
      probes: [{ rust: '::std::format!("F:{:?}", celsius_to_fahrenheit(c))' }],
      expect: (a) => `F:${(a.c.value * 9) / 5 + 32}`,
    },
    {
      args: { a: { i32: [-1000, 1000] }, b: { i32: [-1000, 1000] } },
      repeats: 3,
      probes: [
        {
          setup: "let pair = min_max(a, b);",
          rust: '::std::format!("T:{},{}", pair.0, pair.1)',
        },
      ],
      expect: (a) => `T:${Math.min(a.a.value, a.b.value)},${Math.max(a.a.value, a.b.value)}`,
    },
  ],

  "conditionals-and-loops": [
    {
      args: { n: { u32: [1, 5000] } },
      repeats: 6,
      probes: [{ rust: '::std::format!("S:{}", fizzbuzz(n))' }],
      expect: (a) => `S:${fizzbuzzValue(a.n.value)}`,
    },
  ],

  ownership: [
    {
      args: { word: { str: true }, n: { u32: [0, 99] } },
      repeats: 3,
      probes: [
        {
          setup: 'let text = ::std::format!("{}-{}", word, n);',
          rust: '::std::format!("S:{}", shout(shout(text)))',
        },
      ],
      expect: (a) => `S:${a.word.value}-${a.n.value}!!`,
    },
  ],

  borrowing: [
    {
      args: { a: { str: true }, b: { str: true } },
      repeats: 6,
      probes: [{ rust: '::std::format!("S:{}", longest(a, b))' }],
      expect: (a) => `S:${a.a.value.length >= a.b.value.length ? a.a.value : a.b.value}`,
    },
  ],

  structs: [
    {
      args: { title: { str: true }, author: { str: true }, pages: { u32: [1, 2000] } },
      repeats: 3,
      probes: [
        {
          setup: "let book = Book::new(title, author, pages);",
          rust: '::std::format!("S:{}", book.title)',
        },
        {
          setup: "let book = Book::new(title, author, pages);",
          rust: '::std::format!("S:{}", book.author)',
        },
        {
          setup: "let book = Book::new(title, author, pages);",
          rust: '::std::format!("U:{}", book.pages)',
        },
        {
          setup: "let book = Book::new(title, author, pages);",
          rust: '::std::format!("F:{:?}", book.reading_time())',
        },
      ],
      expect: (a, probe) => {
        if (probe.rust.includes("book.title")) return `S:${a.title.value}`;
        if (probe.rust.includes("book.author")) return `S:${a.author.value}`;
        if (probe.rust.includes("book.pages")) return `U:${a.pages.value}`;
        return `F:${a.pages.value / 2}`;
      },
    },
  ],

  "enums-and-match": [
    {
      repeats: 2,
      probes: [
        {
          rust: '::std::format!("S:{}", TrafficLight::Red.next().name())',
          expect: () => "S:green",
        },
        {
          rust: '::std::format!("S:{}", TrafficLight::Green.next().name())',
          expect: () => "S:yellow",
        },
        {
          rust: '::std::format!("S:{}", TrafficLight::Yellow.next().name())',
          expect: () => "S:red",
        },
        {
          rust: '::std::format!("S:{}", TrafficLight::Red.next().next().name())',
          expect: () => "S:yellow",
        },
        {
          rust: '::std::format!("S:{}", TrafficLight::Yellow.next().next().name())',
          expect: () => "S:green",
        },
      ],
    },
  ],

  collections: [
    {
      args: { numbers: { vec: { len: [0, 8], min: -50, max: 50 } } },
      repeats: 3,
      probes: [
        { rust: '::std::format!("V:{:?}", evens(&numbers))' },
        { rust: '::std::format!("I:{}", even_sum(&numbers))' },
      ],
      expect: (a, probe) => {
        const even = a.numbers.value.filter((n) => n % 2 === 0);
        return probe.rust.includes("even_sum")
          ? `I:${even.reduce((sum, n) => sum + n, 0)}`
          : `V:[${even.join(", ")}]`;
      },
    },
  ],

  errors: [
    {
      args: { numbers: { vec: { len: [0, 7], min: -40, max: 40 } } },
      repeats: 4,
      probes: [{ rust: ERR_MATCH }],
      expect: (a) => {
        const list = a.numbers.value;
        if (list.length === 0) return "R:Err:empty list";
        return `R:Ok:${list.reduce((sum, n) => sum + n, 0) / list.length}`;
      },
    },
    {
      args: { numbers: { vec: { len: [0, 0], min: 0, max: 0 } } },
      repeats: 1,
      probes: [{ rust: ERR_MATCH }],
      expect: () => "R:Err:empty list",
    },
  ],

  "modules-and-tests": [
    {
      args: { sentence: { sentence: [2, 5] } },
      repeats: 3,
      probes: [{ rust: '::std::format!("U:{}", word_count(sentence))' }],
      expect: (a) => `U:${a.sentence.value.split(/\s+/).filter(Boolean).length}`,
    },
    {
      repeats: 1,
      probes: [
        { rust: '::std::format!("U:{}", word_count(""))' },
        { rust: '::std::format!("U:{}", word_count("  one   two\\n\\nthree  "))' },
      ],
      expect: (a, probe) => (probe.rust.includes('""') ? "U:0" : "U:3"),
    },
  ],
};

/** The checks for one lesson, or an empty list if the slug is unknown. */
export function checksFor(slug) {
  return CHECKS[slug] || [];
}

function randomNonce() {
  const bytes = new Uint8Array(4);
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Build one grading run: the hidden module to append to the reader's code,
 * plus the values the page compares the returned results against.
 *
 * The expected values stay in this process. They are never part of `code`,
 * so nothing the reader's program can read contains the answer.
 */
export function createHiddenSuite(slug, checks) {
  const nonce = randomNonce();
  const expected = [];
  const tests = [];
  let index = 0;

  const signatures = SIGNATURES[slug] || [];
  if (signatures.length > 0) {
    tests.push(
      [
        "    #[test]",
        `    fn check_${nonce}_0_signatures() {`,
        ...signatures.map((line) => `        ${line}`),
        "    }",
      ].join("\n"),
    );
  }

  for (const check of Array.isArray(checks) ? checks : []) {
    const repeats = Math.max(1, Number(check.repeats) || 1);
    for (let copy = 0; copy < repeats; copy += 1) {
      const args = {};
      const binds = [];
      for (const [name, spec] of Object.entries(check.args || {})) {
        const value = literal(spec);
        args[name] = value;
        binds.push(`let ${name}: ${value.type} = ${value.text};`);
      }
      for (const probe of check.probes) {
        index += 1;
        const value = probe.expect ? probe.expect(args) : check.expect(args, probe);
        expected.push({ id: index, value, input: describeArgs(args) });
        const setup = probe.setup ? [probe.setup] : [];
        tests.push(
          [
            "    #[test]",
            `    fn check_${nonce}_${index}() {`,
            ...binds.map((line) => `        ${line}`),
            ...setup.map((line) => `        ${line}`),
            `        emit(${index}, ${probe.rust.replace(/\n/g, "\n        ")});`,
            "    }",
          ].join("\n"),
        );
      }
    }
  }

  const code = tests.length
    ? `
#[cfg(test)]
#[allow(unused_variables, dead_code, unused_mut)]
mod hidden_check_${nonce} {
    use super::*;

    const NONCE: &str = "${nonce}";
    static LOCK: ::std::sync::Mutex<()> = ::std::sync::Mutex::new(());

    fn emit(index: usize, value: ::std::string::String) {
        let _guard = LOCK.lock();
        use ::std::io::Write as _;
        /* The result channel is stderr: the test harness writes its own
           progress to stdout from other threads, and a direct write there can
           land in the middle of a line. */
        let mut out = unsafe { <::std::fs::File as ::std::os::fd::FromRawFd>::from_raw_fd(2) };
        let _ = out.write_all(::std::format!("${MARKER}{} {} {}\\n", NONCE, index, value).as_bytes());
        let _ = out.flush();
        ::std::mem::forget(out);
    }

${tests.join("\n\n")}
}
`
    : "";

  return { nonce, code, expected, count: tests.length };
}

/**
 * The results the run wrote through the marker channel, keyed by check id.
 * Each id maps to every line it produced, so a duplicate can be spotted.
 */
export function parseProbeLines(output, nonce) {
  const prefix = `${MARKER}${nonce} `;
  const seen = new Map();
  for (const line of String(output || "").replace(/\r\n?/g, "\n").split("\n")) {
    if (!line.startsWith(prefix)) continue;
    const rest = line.slice(prefix.length);
    const space = rest.indexOf(" ");
    if (space === -1) continue;
    const id = Number(rest.slice(0, space));
    if (!Number.isInteger(id)) continue;
    const list = seen.get(id) || [];
    list.push(rest.slice(space + 1));
    seen.set(id, list);
  }
  return seen;
}

/** Compare what the run reported with what the page computed. */
export function judgeProbes(expected, seen) {
  for (const item of expected) {
    const got = seen.get(item.id) || [];
    if (got.length === 0) return { pass: false, missing: true, item };
    if (got.length > 1) return { pass: false, duplicate: true, item, got: got[0] };
    if (!sameEncoded(got[0], item.value)) return { pass: false, item, got: got[0] };
  }
  for (const id of seen.keys()) {
    if (!expected.some((item) => item.id === id)) {
      return { pass: false, unexpected: true, id };
    }
  }
  return { pass: true, count: expected.length };
}

/**
 * Decide whether one grading run passed.
 *
 * A pass needs every expected result, no failures, and a clean harness
 * summary. `ownTests` is the number of tests the lesson asks the reader to
 * write; those must pass too.
 */
export function gradeRun(suite, result, { ownTests = 0 } = {}) {
  const seen = parseProbeLines(`${result.stdout}\n${result.stderr}`, suite.nonce);
  const ownPassed = countOwnPasses(result.stdout);

  if (looksLikeCompileError(result.stderr) && seen.size === 0) {
    return { pass: false, kind: "compile" };
  }

  /* A failing assertion is reported first, so the reader sees the assertion
     message rather than a comment about the summary. */
  const summary = readTestSummary(result.stdout);
  const expectedTotal = suite.count + ownTests;
  if (summary.reason === "failed" || summary.failed > 0 || hasFailedTest(result.stdout)) {
    const failures = parseFailures(result.stdout);
    return {
      pass: false,
      kind: "hidden",
      seen,
      ownPassed,
      message: failures.length
        ? `One check disagreed: ${failures[0]}`
        : "The hidden checks did not all pass. Read the assertion output; it names the value your function returned.",
    };
  }

  /* The harness must have run to the end: one summary, as the last thing
     printed. Exiting early, ignoring tests, or printing a summary of your own
     cannot satisfy this. */
  if (!summary.ok) {
    return {
      pass: false,
      kind: "hidden",
      seen,
      ownPassed,
      message:
        summary.reason === "missing"
          ? "The test harness did not finish. Do not call process::exit, and do not stop the program from inside a test."
          : "The test output did not end with a single clean summary line. Remove anything that writes test output of its own.",
    };
  }
  if (!result.success) {
    return {
      pass: false,
      kind: "hidden",
      seen,
      ownPassed,
      message: "The test run did not exit cleanly. Fix the error in the messages below, then check again.",
    };
  }
  if (summary.ignored > 0 || summary.passed < expectedTotal) {
    return {
      pass: false,
      kind: "hidden",
      seen,
      ownPassed,
      message: `Only ${summary.passed} of the ${expectedTotal} checks ran. Do not skip or ignore tests.`,
    };
  }
  if (ownTests > 0 && ownPassed < ownTests) {
    return {
      pass: false,
      kind: "own-tests",
      seen,
      ownPassed,
      message: `The checker needs ${ownTests} tests of your own that pass, and ${suite.count} hidden ones. It saw ${ownPassed} of yours.`,
    };
  }
  const verdict = judgeProbes(suite.expected, seen);
  if (!verdict.pass) return { ...verdict, kind: "hidden", seen, ownPassed };
  return { pass: true, kind: "ok", seen, ownPassed, count: suite.count };
}

/** Remove the internal marker lines before showing output to the reader. */
export function stripMarkers(text) {
  return String(text || "")
    .split("\n")
    .filter((line) => !line.includes(MARKER))
    .join("\n");
}

/** Turn an encoded result into something a beginner can read. */
export function describeValue(raw) {
  const text = String(raw || "");
  const round = (value) => String(Number(Number(value).toFixed(6)));
  if (text.startsWith("S:")) return JSON.stringify(text.slice(2));
  if (text.startsWith("F:")) return round(text.slice(2));
  if (text.startsWith("I:") || text.startsWith("U:")) return text.slice(2);
  if (text.startsWith("T:")) return `(${text.slice(2)})`;
  if (text.startsWith("V:")) return text.slice(2);
  if (text.startsWith("R:Ok:")) return `Ok(${round(text.slice(5))})`;
  if (text.startsWith("R:Err:")) return `Err(${JSON.stringify(text.slice(6))})`;
  return JSON.stringify(text);
}

/* ------------------------------------------------------------ run output */

/** Readable messages for the assertions that failed. */
export function parseFailures(stdout) {
  const text = String(stdout || "");
  const found = [];
  const re = /panicked at [^\n]*\n([^\n]+)\n/g;
  let match;
  while ((match = re.exec(text))) {
    const line = match[1].trim();
    if (line && !found.includes(line)) found.push(line);
  }
  if (found.length === 0) {
    const block = text.match(/---- [^\n]+ stdout ----\n([\s\S]*?)\n\n/);
    if (block) found.push(block[1].trim());
  }
  return found;
}

/**
 * Grade a whole submission, including the rule that the reader's own tests
 * must be able to fail.
 *
 * `runTests` is the caller's way to run Rust with `cargo test`; the page
 * passes the Playground, the verifier passes its own runner. Keeping the rule
 * here means the page and the verifier cannot drift apart.
 */
export async function gradeSubmission({ code, suite, result, ownTests = 0, runTests }) {
  const graded = gradeRun(suite, result, { ownTests });
  if (!graded.pass || ownTests <= 0) return graded;

  const mutants = mutantSources(code);
  if (mutants.length === 0) return graded;

  const runs = await Promise.all(mutants.map((source) => runTests(source)));
  const caught = runs.some((run) => countFailedTests(run.stdout) >= ownTests);
  if (!caught) {
    return {
      pass: false,
      kind: "own-tests",
      seen: graded.seen,
      ownPassed: graded.ownPassed,
      message: `Your tests still pass when word_count is deliberately broken. All ${ownTests} of them should fail then, so check the value the function returns: assert_eq!(word_count("one two three"), 3).`,
    };
  }
  return graded;
}

/**
 * Read cargo's final summary line.
 *
 * A clean run has exactly one summary, it is the last thing printed, and it
 * reports no failures and no ignored tests.
 */
export function readTestSummary(stdout) {
  const lines = String(stdout || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());
  const found = [];
  for (const line of lines) {
    const match = line.match(
      /^test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out; finished in [\d.]+s$/,
    );
    if (match) {
      found.push({
        line,
        status: match[1],
        passed: Number(match[2]),
        failed: Number(match[3]),
        ignored: Number(match[4]),
        filtered: Number(match[5]),
      });
    }
  }
  const last = [...lines].reverse().find((line) => line.trim() !== "") || "";
  if (found.length === 0) return { ok: false, reason: "missing" };
  if (found.length > 1) return { ok: false, reason: "duplicate", ...found[found.length - 1] };
  const summary = found[0];
  if (summary.line !== last) return { ok: false, reason: "not-last", ...summary };
  if (summary.status !== "ok") return { ok: false, reason: "failed", ...summary };
  if (summary.ignored > 0) return { ok: false, reason: "ignored", ...summary };
  if (summary.filtered > 0) return { ok: false, reason: "filtered", ...summary };
  return { ok: true, ...summary };
}

/** How many of the reader's own tests reported `... ok`. */
export function countOwnPasses(stdout) {
  const text = String(stdout || "");
  const re = /^test (\S+) \.\.\. ok\s*$/gm;
  let count = 0;
  let match;
  while ((match = re.exec(text))) {
    if (!match[1].startsWith("hidden_check_")) count += 1;
  }
  return count;
}

/** True when the harness reported any test as failed. */
export function hasFailedTest(stdout) {
  return /^test \S+ \.\.\. FAILED\s*$/m.test(String(stdout || ""));
}

/** How many tests reported FAILED. */
export function countFailedTests(stdout) {
  return [...String(stdout || "").matchAll(/^test \S+ \.\.\. FAILED\s*$/gm)].length;
}

/** True when the compiler, rather than a test, rejected the code. */
export function looksLikeCompileError(stderr) {
  return /(^|\n)error(\[E\d{4}\])?:|could not compile/.test(String(stderr || ""));
}

/**
 * Rename the reader's `word_count` and put deliberately broken versions in
 * its place, so their own tests can be run against code that is wrong.
 *
 * Two different wrong versions are used, and both the replacement name and
 * the body are drawn fresh, so a test cannot recognise the run by looking for
 * a fixed string in its own source. A test suite that is actually checking
 * the count fails against at least one of them.
 *
 * Returns an empty list when the source does not define `word_count`, in
 * which case the caller skips the check rather than guessing.
 */
export function mutantSources(code) {
  const pattern = /\bfn\s+word_count\s*\(/g;
  const matches = String(code).match(pattern);
  if (!matches || matches.length === 0) return [];

  const suffix = randomNonce().slice(0, 6);
  const renamed = String(code).replace(pattern, `fn word_count_original_${suffix}(`);
  const wrong = [
    "text.split_whitespace().count() + 1",
    "text.lines().count()",
  ];

  return wrong.map(
    (body, index) => `${renamed}
/* ${randomNonce()} */
fn word_count(text: &str) -> usize {
    let _ = "${suffix}${index}";
    ${body}
}
`,
  );
}
