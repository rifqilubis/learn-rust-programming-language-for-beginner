# rust·learn

A twelve lesson Rust course for people who have never compiled anything. Static
site, no build step at runtime, no tracking, no account.

Every code sample on the site runs against the public
[Rust Playground](https://play.rust-lang.org), so the output you see is what the
compiler actually produced.

Each lesson ends with an exercise you type in the page. Lesson 1 only asks for
two lines of output: it comes before `fn` is taught, so printing them is the
task. Its second line must also use two `{}` slots, so copying the line as one
string does not pass, and the slot line has to run in the normal program and
produce that second line: a plain line, a dead two-slot call, a two-slot call
on the wrong line, or a slot call that only runs under `cargo test` is
rejected.

Every later exercise names the functions to write. The checker calls those
functions with arguments drawn when you press Check. The answers are computed in
the browser and compared against what your code returns, so printing the
exercise's expected output does not pass: the functions are missing, or they do
not compute. The output panel still has to match too, and the next lesson
unlocks only when both do.

The last lesson asks you to write tests. Your tests are run twice: once against
your `word_count`, and once against a deliberately broken one. If they pass the
broken version, they are not testing anything, and the exercise stays locked.
They are also run against a correct version written differently, so tests that
only notice the source was renamed do not pass.

Stuck? Every exercise has **Show tips** (at least three steps, from the idea down
to the exact line) and **Show solution** (a reference answer you can read, copy,
or load into the editor). Neither one unlocks the lesson: loading the answer only
fills the box, and the checker still has to run and pass it.

This is a self-study site, not an exam. Progress lives in your own browser's
`localStorage`, so it can be edited, and with JavaScript off the lesson links
stay reachable. The exercises are graded honestly when you press Check; nobody
is checking up on the stored progress.

## Run it locally

```bash
python3 server.py
```

Then open <http://127.0.0.1:8000>. Add a port if 8000 is taken, and `--open` if
you want the browser to come up on its own:

```bash
python3 server.py 8080 --open
```

`server.py` is a small stdlib wrapper: it serves the folder, turns off caching so
edits show up on reload, and stops with a clear message if the port is busy. It
needs nothing installed, and there is no server-side code.

Serving over `http://` rather than opening the files directly matters: the Run
buttons call the Rust Playground with `fetch()`, and progress is kept in
`localStorage`. Browsers block both on `file://` URLs.

Any static file server works too, if you prefer: `python3 -m http.server 8000`,
`npx serve`, or anything else.

## Build

`index.html`, `lessons.html`, `playground.html`, and the twelve lesson pages are
generated from `content/lessons.mjs`. Edit the content, then:

```bash
node build.mjs
```

Node 18 or newer. The site itself has no runtime dependencies; the browser
verification tools use the `puppeteer` and `axe-core` dev dependencies, installed
with `npm install`.

## Verify

```bash
node tools/verify-samples.mjs    # compile every sample, then run it and compare stdout
node tools/verify-exercises.mjs  # every exercise's solution passes, its starter does not
node tools/attack-exercises.mjs  # cheats aimed at the marker channel itself
node tools/attack-source-reading.mjs  # cheats that read the hidden module from the source
node tools/click-through.mjs     # click through the site in headless Chrome
node tools/a11y-audit.mjs        # axe-core, WCAG 2.1/2.2 AA, both themes
```

`verify-samples.mjs` needs a Rust toolchain and network access for the run half.
`verify-exercises.mjs` needs a Rust toolchain and network access (use `--local`
for compile checks only), and it is the check that keeps
the exercises honest. For every lesson it proves the reference solution passes
and prints the expected output, and that the starter and the usual cheats fail:
a program that only prints the expected output, a function hard-coded to the
example, a program that exits before the tests finish, a forged test summary,
and forged result lines. Lesson 1 has no hidden function, so it is checked on
output in one normal run: the second line must use two `{}` slots, the same run
must report that a two-slot call built the expected second line, the solution
prints the expected two lines, the starter does not, and a plain `println!`
without slots does not satisfy the check. It also rejects a plain output with a
dead two-slot call, one split across `print!` and `println!`, a two-slot call
placed on the first line, and a slot call guarded by `cfg!(test)` or placed in a
reader `#[test]`, neither of which runs outside the harness. In lesson 12 it
proves the reader's own tests are required, that they catch a broken
`word_count`, that they still pass on a correct variant written differently,
and that tests which only notice the source was renamed are rejected. It also
checks that every exercise has at least three beginner tips and a reference
solution.

The source checks are teaching gates, not security boundaries: a determined
reader can obfuscate a plain line past the static check, but the same-run marker
catches any plain output actually printed instead of a two-slot `println!`.
Lesson 1 is the exception: its expected line is public, so forging the marker
means reading the program's own source, which is more work than the exercise.
Progress in `localStorage` is likewise client-side state, not an authority.

`attack-exercises.mjs` goes after the grader itself rather than the exercises.
It runs seven cheats aimed at the marker channel — spraying wildcard markers,
shadowing `emit`, forging a summary and exiting, duplicating the channel on
stdout, writing through a raw fd — on top of the starter code of every lesson
with hidden checks, and fails if any of them is graded as a pass. `attack-source-reading.mjs`
covers the one that matters most: the playground does let a program read
`/playground/src/main.rs`, so the nonce and the drawn arguments are readable.
That is enough to forge a line for a given id, but not to know what the page
expects for it, because the expected value is computed in the browser and never
sent to the playground.

The browser tools need the `puppeteer` dev dependency and a Chrome binary. They
are development dependencies, not part of the site. Start `python3 server.py`
first and pass the URL:

```bash
npm install
node tools/click-through.mjs http://127.0.0.1:8000
node tools/a11y-audit.mjs http://127.0.0.1:8000
```

Set `CHROME_PATH` to use a specific Chrome instead of the one Puppeteer
downloads.

## Layout

```
index.html                     home
lessons.html                   course map
playground.html                scratch pad
lesson-NN-*.html               generated lesson pages
content/lessons.mjs            all lesson copy, the source of truth
content/partials.mjs           sample, callout, and command markup
build.mjs                      the generator
assets/css/site.css            one stylesheet
assets/js/exercises.js          exercise checks, shared by the page and the verifier
assets/js/site.js              theme, nav, progress, runner, exercise checker
assets/fonts/                  self-hosted Zilla Slab, Source Sans 3, Source Code Pro
assets/vendor/                 Prism (MIT), for syntax colouring
tools/                         verification scripts (samples, exercises, browser, a11y)
server.py                      local dev server, standard library only
DESIGN.md                      the direction this site was built against
```

## Credit

Lesson scope follows the official [Rust Book](https://doc.rust-lang.org/book/).
The wording here is original and shorter; where the two differ in depth, the book
is the reference.

Fonts are under the SIL Open Font License, Prism is MIT. Licence texts sit next
to the files they cover.
