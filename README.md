# rust·learn

A twelve lesson Rust course for people who have never compiled anything. Static
site, no build step at runtime, no tracking, no account.

Every code sample on the site runs against the public
[Rust Playground](https://play.rust-lang.org), so the output you see is what the
compiler actually produced.

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

Node 18 or newer. The only dependency is Node itself.

## Verify

Two checks, both run against the files the build produces:

```bash
node tools/verify-samples.mjs    # compile every sample, then run it and compare stdout
node tools/click-through.mjs     # click through the site in headless Chrome
node tools/a11y-audit.mjs        # axe-core, WCAG 2.1/2.2 AA, both themes
```

`verify-samples.mjs` needs a Rust toolchain and network access for the run half.
The browser tools need Chrome and `puppeteer-core`; they are development
dependencies, not part of the site.

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
assets/js/site.js              theme, nav, progress, Playground runner
assets/fonts/                  self-hosted Zilla Slab, Source Sans 3, Source Code Pro
assets/vendor/                 Prism (MIT), for syntax colouring
tools/                         verification scripts
server.py                      local dev server, standard library only
DESIGN.md                      the direction this site was built against
```

## Credit

Lesson scope follows the official [Rust Book](https://doc.rust-lang.org/book/).
The wording here is original and shorter; where the two differ in depth, the book
is the reference.

Fonts are under the SIL Open Font License, Prism is MIT. Licence texts sit next
to the files they cover.
