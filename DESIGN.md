# DESIGN.md

Direction for `rust·learn`, a beginner Rust course. Supplied by the site owner
(selected from three offered directions), transcribed here so the build has one
source of truth.

**Dial: ENERGY 2 / RHYTHM 3 / MOTION 1**

## Identity

A workshop, not a SaaS landing page. Charcoal bench, oxide and amber, code sitting
on a dark surface like a part on a workbench. The reader is an apprentice with the
tools in front of them, not a buyer being sold something.

## Palette

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#14110F` | `#F4EEE6` | page ground |
| `--surface` | `#1C1815` | `#FBF7F1` | raised panel |
| `--bench` | `#0F0D0B` | `#0F0D0B` | code surface, constant in both themes |
| `--text` | `#EFE7DC` | `#1A1512` | body copy |
| `--muted` | `#B9ADA1` | `#5E5349` | secondary copy |
| `--oxide` | `#D2603A` | `#A8421F` | the one accent: links, primary action |
| `--amber` | `#E8B04B` | `#8A5B00` | state only: focus ring, current lesson, progress fill |

Why these: oxide is the color of rust itself, so the accent is the subject. Amber
is a signal color kept off decoration, so "where am I" and "what has focus" read
instantly. Charcoal and paper are neutral ground and do not count against the
palette limit. The bench stays dark in light mode because a workbench is a fixed
object, and it keeps every code sample at the same contrast in both themes.

## Typography

| Face | Use | Why |
|---|---|---|
| Zilla Slab 600/700 | headings, wordmark | slab serif reads as stenciled crate and workshop signage, and it separates this course from the geometric sans every dev site uses |
| Source Sans 3 400-700 | body | humanist sans with a tall x-height, holds up in long instructional paragraphs |
| Source Code Pro 400-600 | code, labels, numbers | even spacing for Rust's punctuation-heavy syntax, and its digits do not wobble in the lesson gutter |

Self-hosted from `assets/fonts/` so the site has no third-party font request.

## Motif

**The gutter number.** Every lesson, every step inside a lesson, and every part of
the course carries a stamped number in the left margin, set in mono with a hairline
rule. A course is already a numbered thing, so the number is content, not ornament.
It repeats on the home page, the course map, and every lesson page.

## Dials, and what they mean here

- **ENERGY 2**: confident type and one strong accent, no shouting. Nothing bounces.
- **RHYTHM 3**: the home page is asymmetric (text left, live bench right), the course
  map is a ledger of rows, a lesson is a two-column reader. No two sections share a
  composition.
- **MOTION 1**: hover, focus, and state transitions only. No scroll reveal, no
  parallax, no typing animations. The only thing that "runs" is real code.

## What is deliberately absent

No testimonials, no pricing, no logo bar, no FAQ, no hero badge, no fake terminal,
no invented statistics, no student counts. There is nothing true to put there yet,
so the space stays empty.

## Assets

- Wordmark: the product name set in Zilla Slab. No logo mark was drawn.
- Favicon: the same wordmark reduced to one letter, a placeholder until the owner
  supplies a mark.
- Icons: inline SVG only where the icon names an action (run, copy, check, menu,
  theme). No icon set, no decorative glyphs.

## Functional contract

Every control does something real: lessons navigate, code runs against the public
Rust Playground API, progress persists in `localStorage`, the theme toggle works in
both directions, and the mobile menu opens and closes with pointer, Enter, and
Escape.

The exercise at the end of each lesson is a real gate, not a suggestion. It is the
same bench as everywhere else (dark, mono, oxide action), with the expected output
printed above it so the target is never a guess. A pass compares standard output
line for line, or runs the reader's tests plus three appended ones in the last
lesson. The next lesson stays locked until it passes; the pass and the draft code
both persist in `localStorage`, so a reload does not cost the reader their work.
