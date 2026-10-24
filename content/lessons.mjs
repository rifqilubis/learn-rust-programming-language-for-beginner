import { sample, callout, cmd, sections, slugify } from "./partials.mjs";

export const lessons = [
  {
    slug: "install-and-first-program",
    title: "Install Rust and run a program",
    lede:
      "One toolchain, one project, one line of output. By the end of this lesson a program you wrote is running on your machine.",
    minutes: 12,
    group: "Setup",
    body: () => sections([
      {
        title: "What you are actually installing",
        html: `<p>Rust ships as three pieces that work together. You install them once, through a tool called <code>rustup</code>, and then stop thinking about it.</p>
<ul>
  <li><strong>rustc</strong> is the compiler. It turns a <code>.rs</code> file into a program.</li>
  <li><strong>cargo</strong> is the project tool. It creates projects, downloads libraries, builds, and runs tests.</li>
  <li><strong>rustup</strong> is the installer. It manages which version of the two above you have.</li>
</ul>
<p>You will call <code>cargo</code> almost every day and <code>rustc</code> almost never. That is normal.</p>`,
      },
      {
        title: "Install",
        html: `<p>On Linux or macOS, run this in a terminal and follow the prompts. The default options are the right ones.</p>
${cmd("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh")}
<p>On Windows, download and run <code>rustup-init.exe</code> from <a href="https://rustup.rs">rustup.rs</a>. It will offer to install the Microsoft C++ build tools if they are missing, and you should accept, because the linker lives there.</p>
<p>Close the terminal and open a new one so the path change takes effect, then check the install:</p>
${cmd("rustc --version && cargo --version")}
<p>You should see two version numbers. If you see a command not found error, the installer's path line did not reach your shell, so open a fresh terminal or run <code>source ~/.cargo/env</code>.</p>`,
      },
      {
        title: "Create a project",
        html: `<p>Never start with a bare <code>.rs</code> file. Cargo needs a folder with a manifest to know how to build and run your code.</p>
${cmd("cargo new hello_rust && cd hello_rust")}
<p>That gives you this:</p>
<pre class="tree"><code>hello_rust/
├── Cargo.toml
└── src/
    └── main.rs</code></pre>
<p><code>Cargo.toml</code> is the manifest: the project name, the version, and later the libraries you depend on. <code>src/main.rs</code> is your program, and it already contains a working one.</p>`,
      },
      {
        title: "Read the program",
        html: `<p>Open <code>src/main.rs</code>. It contains exactly this:</p>
${sample(`fn main() {
    println!("Hello, world!");
}`, { label: "src/main.rs", out: "Hello, world!" })}
<p>Three things are happening. <code>fn main()</code> declares the entry point, the function the operating system calls when the program starts. The braces hold the body. <code>println!</code> is a macro, which you can tell by the exclamation mark, and it prints a line of text followed by a newline.</p>
<p>Those quotation marks matter. Without them you would be naming a variable, not writing text.</p>`,
      },
      {
        title: "Run it",
        html: `<p>From inside the project folder:</p>
${cmd("cargo run")}
<p>The first run compiles, so it takes a second or two. Every run after that reuses the build, so it is instant until you change a file. You should see the greeting printed under a <code>Running</code> line.</p>
${callout("note", "Two more commands", `<p><code>cargo build</code> compiles without running. <code>cargo check</code> checks for errors without producing a program, and it is the fastest of the three, so reach for it while you are editing.</p>`)}`,
      },
      {
        title: "Make it yours",
        html: `<p>Change the text and add a second line. The <code>{}</code> pair is a slot, and the value after the comma fills it, in order.</p>
${sample(`fn main() {
    println!("Hello, world!");
    println!("I am learning {} in {}", "Rust", 2026);
}`, { label: "src/main.rs", out: "Hello, world!\nI am learning Rust in 2026" })}
<p>Run it with <code>cargo run</code> and confirm both lines appear.</p>`,
      },
      {
        title: "If something breaks",
        html: `<p>Compilers complain, and Rust's complaints are unusually specific. Read the first error only, fix it, then run again, because later errors are often knock-on effects.</p>
${sample(`fn main() {
    println!("first line")
    println!("second line");
}`, { label: "src/main.rs", run: false, tag: "does not compile", note: "The first line is missing its semicolon, so the compiler reaches the second <code>println!</code> while still expecting one. It reports <code>expected `;`, found `println`</code> and puts a caret at the exact spot." })}
<p>Notice the shape of the message: an error code, the file and line, a caret pointing at the exact character, and usually a suggested fix. Every error code has a full page of explanation, which you can read with <code>rustc --explain E0308</code> or any other code the compiler prints.</p>`,
      },
    ]),
    exercise: {
      prompt:
        "Write <code>fn year_line(year: u32) -&gt; String</code> that returns <code>Learning Rust in 2026</code> when given 2026. Then print <code>Hello from Rust!</code> and the line for 2026. The checker calls your function with years you have not seen.",
      hint:
        "Use <code>format!(\"Learning Rust in {year}\")</code> as the last expression, with no semicolon. <code>format!</code> builds a <code>String</code>; <code>println!</code> only prints one.",
      tips: [
        `The two <code>println!</code> lines in <code>main</code> are already correct. The only part you need to change is the body of <code>year_line</code>.`,
        `A function returns its last expression when there is no semicolon. <code>format!("Learning Rust in {year}")</code> builds the <code>String</code> to return; <code>println!</code> only prints, so it cannot be the return value.`,
        `Match the expected text exactly: capital <code>L</code>, one space after <code>in</code>, and the year in the <code>{year}</code> slot. Compare your result with the expected output panel line by line.`,
      ],
      requires: "fn year_line(year: u32) -> String",
      starter: `fn main() {
    println!("Hello from Rust!");
    println!("{}", year_line(2026));
}

fn year_line(year: u32) -> String {
    // Return the line. Do not print it here.
    String::new()
}`,
      expected: `Hello from Rust!
Learning Rust in 2026`,
      solution: `fn main() {
    println!("Hello from Rust!");
    println!("{}", year_line(2026));
}

fn year_line(year: u32) -> String {
    format!("Learning Rust in {year}")
}`,
    },
  },

  {
    slug: "variables-and-mutability",
    title: "Variables, mutability, and shadowing",
    lede:
      "Rust makes you say when a value can change. That one word removes a whole category of bugs, and it takes ten minutes to get used to.",
    minutes: 15,
    group: "Basics",
    body: () => sections([
      {
        title: "A binding is immutable by default",
        html: `<p><code>let</code> creates a binding. Unless you say otherwise, the name cannot be reassigned, and the compiler refuses the second assignment.</p>
${sample(`fn main() {
    let apples = 3;
    println!("apples: {apples}");
}`, { label: "src/main.rs", out: "apples: 3" })}
<p>Try adding <code>apples = 4;</code> on the next line and running it. The compiler stops you with <code>cannot assign twice to immutable variable</code> and points at both the declaration and the reassignment, so you can see the two places that disagree.</p>
<p>This is not a limitation to work around. Most values in a program never change after they are created, and the compiler is enforcing that fact for free.</p>`,
      },
      {
        title: "When it must change, say so",
        html: `<p><code>mut</code> marks a binding as changeable. It is a promise that this value has a reason to move.</p>
${sample(`fn main() {
    let mut baskets = 1;
    println!("baskets: {baskets}");

    baskets = 2;
    println!("baskets: {baskets}");

    baskets += 3;
    println!("baskets: {baskets}");
}`, { label: "src/main.rs", out: "baskets: 1\nbaskets: 2\nbaskets: 5" })}
<p>Use <code>mut</code> where the value genuinely changes, not everywhere to silence the compiler. A file where every binding is <code>mut</code> tells you nothing about which state is actually in motion.</p>`,
      },
      {
        title: "Shadowing is a different tool",
        html: `<p>You can declare the same name again with a new <code>let</code>. The old binding is not changed, it is hidden, and the new one can even have a different type.</p>
${sample(`fn main() {
    let size = 10;
    println!("size: {size}");

    let size = size * 2;
    println!("size: {size}");

    let size = "large";
    println!("size: {size}");
}`, { label: "src/main.rs", out: "size: 10\nsize: 20\nsize: large" })}
<p>Shadowing is how you keep a name while changing what it means, for example parsing text into a number and keeping the same name:</p>
${sample(`fn main() {
    let input = "  42  ";
    let input: i32 = input.trim().parse().expect("not a number");
    println!("input + 1 = {}", input + 1);
}`, { label: "src/main.rs", out: "input + 1 = 43" })}
<p>The difference from <code>mut</code> is type and intent. <code>mut</code> means the same value changes. Shadowing means a new value takes over the name, and the old one is gone.</p>`,
      },
      {
        title: "Constants",
        html: `<p><code>const</code> declares a value fixed at compile time. It needs a type, it lives for the whole program, and by convention its name is upper case.</p>
${sample(`const MAX_PARTS: u32 = 500;

fn main() {
    println!("the workshop holds {MAX_PARTS} parts");
}`, { label: "src/main.rs", out: "the workshop holds 500 parts" })}
<p>Use <code>const</code> for values that are the same in every run. Use <code>let</code> for everything computed at runtime.</p>`,
      },
      {
        title: "Naming",
        html: `<p>Rust style is not a matter of taste here, the compiler will warn you. Bindings and functions use <code>snake_case</code>, types and enums use <code>UpperCamelCase</code>, and constants use <code>SCREAMING_SNAKE_CASE</code>.</p>
<p>Names are read far more often than they are written, so prefer <code>remaining_attempts</code> over <code>n</code> once the meaning is not obvious from the line above.</p>`,
      },
    ]),
    exercise: {
      prompt:
        "Write <code>fn total(price: f64, quantity: u32) -&gt; f64</code> and <code>fn discounted(price: f64, quantity: u32) -&gt; f64</code>, where the second takes 10 percent off. For a price of 12.5 and a quantity of 4, print <code>total: 50.00</code> and <code>discounted: 45.00</code>.",
      hint:
        "Cast with <code>quantity as f64</code>. Inside <code>discounted</code>, shadow the parameter with <code>let price = price * 0.9;</code> and then multiply, exactly as the lesson did in <code>main</code>. Print with <code>{:.2}</code>.",
      tips: [
        `The <code>println!</code> lines in <code>main</code> already call both functions. You only need to replace the two <code>0.0</code> bodies.`,
        `<code>price</code> is an <code>f64</code> and <code>quantity</code> is a <code>u32</code>. Rust will not multiply them directly, so convert first: <code>price * quantity as f64</code>.`,
        `For <code>discounted</code>, work out the new price before multiplying. The lesson shows the shadowing pattern: <code>let price = price * 0.9;</code>, then use <code>price</code> on the next line.`,
      ],
      requires: "fn total(price: f64, quantity: u32) -> f64\nfn discounted(price: f64, quantity: u32) -> f64",
      starter: `fn main() {
    let price = 12.5;
    let quantity = 4;

    println!("total: {:.2}", total(price, quantity));
    println!("discounted: {:.2}", discounted(price, quantity));
}

fn total(price: f64, quantity: u32) -> f64 {
    0.0
}

fn discounted(price: f64, quantity: u32) -> f64 {
    0.0
}`,
      expected: `total: 50.00
discounted: 45.00`,
      solution: `fn main() {
    let price = 12.5;
    let quantity = 4;

    println!("total: {:.2}", total(price, quantity));
    println!("discounted: {:.2}", discounted(price, quantity));
}

fn total(price: f64, quantity: u32) -> f64 {
    price * quantity as f64
}

fn discounted(price: f64, quantity: u32) -> f64 {
    let price = price * 0.9;
    price * quantity as f64
}`,
    },
  },

  {
    slug: "types",
    title: "Numbers, text, and tuples",
    lede:
      "Rust has a small set of built-in types and no implicit conversions between them. Learn the five you will use daily and the rest follow.",
    minutes: 16,
    group: "Basics",
    body: () => sections([
      {
        title: "Whole numbers",
        html: `<p>Integers come in signed (<code>i</code>) and unsigned (<code>u</code>) form, in widths of 8, 16, 32, 64, and 128 bits, plus <code>isize</code> and <code>usize</code> which match the machine's pointer size.</p>
${sample(`fn main() {
    let small: u8 = 255;
    let negative: i32 = -12;
    let big: u64 = 18_000_000_000;
    let index: usize = 3;

    println!("{small} {negative} {big} {index}");
}`, { label: "src/main.rs", out: "255 -12 18000000000 3" })}
<p>The underscore in <code>18_000_000_000</code> is a readability aid, not syntax you have to remember. <code>usize</code> is what you use for lengths and indexes, because that is what the standard library expects.</p>
<p>If you do not write a type, Rust infers <code>i32</code> for integers. That default is fast on every platform, so let it work unless a specific size is part of the problem.</p>`,
      },
      {
        title: "Decimals",
        html: `<p>Floating point comes as <code>f32</code> or <code>f64</code>, and the default is <code>f64</code>. Use it for measurements, money arithmetic that has been thought through, and anything scientific. Do not use it for exact currency, because 0.1 plus 0.2 is not 0.3 in binary floating point.</p>
${sample(`fn main() {
    let price: f64 = 19.99;
    let tax_rate = 0.08;
    let total = price * (1.0 + tax_rate);

    println!("total: {total:.2}");
}`, { label: "src/main.rs", out: "total: 21.59" })}
<p><code>{:.2}</code> means print with two decimal places. The number after the colon is a format specification, and it works on any float.</p>`,
      },
      {
        title: "Text: char and String",
        html: `<p><code>char</code> is one Unicode scalar value in single quotes. <code>String</code> is growable text you own, in double quotes.</p>
${sample(`fn main() {
    let letter: char = 'R';
    let name: String = String::from("Ferris");
    let literal = "borrowed text";

    println!("{letter} {name} {literal}");
    println!("{} characters in {name}", name.chars().count());
}`, { label: "src/main.rs", out: "R Ferris borrowed text\n6 characters in Ferris" })}
<p><code>&amp;str</code>, the type of <code>literal</code>, is a borrowed view of text. You will meet it constantly as a function parameter, and lesson 7 explains why it exists. For now, the rule of thumb is: <code>String</code> when you build or own text, <code>&amp;str</code> when you only read it.</p>`,
      },
      {
        title: "Booleans",
        html: `<p><code>bool</code> is <code>true</code> or <code>false</code> and nothing else. Rust will not accept 0 or 1 in its place, unlike C.</p>
${sample(`fn main() {
    let ready = true;
    let empty = "".is_empty();

    println!("ready: {ready}");
    println!("empty: {empty}");
}`, { label: "src/main.rs", out: "ready: true\nempty: true" })}`,
      },
      {
        title: "Tuples group values of different types",
        html: `<p>A tuple is a fixed set of values, each with its own type. Reach for one when you need to return two related things without inventing a struct.</p>
${sample(`fn main() {
    let part: (i32, f64) = (7, 2.5);

    println!("whole tuple: {:?}", part);
    println!("first: {}, second: {}", part.0, part.1);

    let (count, weight) = part;
    println!("count {count}, weight {weight}");
}`, { label: "src/main.rs", out: "whole tuple: (7, 2.5)\nfirst: 7, second: 2.5\ncount 7, weight 2.5" })}
<p>Access by position with <code>.0</code> and <code>.1</code>, or destructure into names with a pattern. <code>{:?}</code> is the debug format, the one to reach for when you want to see a value during development.</p>`,
      },
      {
        title: "No silent conversions",
        html: `<p>Adding an <code>i32</code> to an <code>i64</code> is an error, not a promotion. You convert explicitly with <code>as</code>.</p>
${sample(`fn main() {
    let count: i32 = 5;
    let total: i64 = 100;
    let sum = total + count as i64;

    println!("sum: {sum}");
}`, { label: "src/main.rs", out: "sum: 105" })}
${callout("note", "Why so strict", `<p>Implicit narrowing is where a lot of production bugs come from. Rust makes the conversion visible so you cannot do it by accident, and the <code>as</code> keyword is your signal to check the range.</p>`)}`,
      },
    ]),
    exercise: {
      prompt:
        "Build the tuple <code>(\"coffee\", 3, 4.5)</code> and print it with the debug format. Then print <code>line total: 13.50</code>, computed by <code>fn line_total(quantity: u32, price: f64) -&gt; f64</code>. The checker calls that function with other quantities and prices.",
      hint:
        "Multiply <code>quantity as f64 * price</code>. Destructure the tuple to get the two numbers, and print the total with <code>{:.2}</code>.",
      tips: [
        `The tuple printing and the <code>println!</code> in <code>main</code> are already done. Only the body of <code>line_total</code> needs work.`,
        `The two values have different types: <code>quantity</code> is <code>u32</code>, <code>price</code> is <code>f64</code>. Convert the quantity with <code>quantity as f64</code> before multiplying.`,
        `The last line of the function is the return value, so it needs no <code>return</code> keyword and no semicolon: <code>quantity as f64 * price</code>.`,
      ],
      requires: "fn line_total(quantity: u32, price: f64) -> f64",
      starter: `fn main() {
    let item = ("coffee", 3, 4.5);

    println!("{:?}", item);

    let (_name, quantity, price) = item;
    println!("line total: {:.2}", line_total(quantity, price));
}

fn line_total(quantity: u32, price: f64) -> f64 {
    0.0
}`,
      expected: `("coffee", 3, 4.5)
line total: 13.50`,
      solution: `fn main() {
    let item = ("coffee", 3, 4.5);

    println!("{:?}", item);

    let (_name, quantity, price) = item;
    println!("line total: {:.2}", line_total(quantity, price));
}

fn line_total(quantity: u32, price: f64) -> f64 {
    quantity as f64 * price
}`,
    },
  },

  {
    slug: "functions",
    title: "Functions and return values",
    lede:
      "A function is a name for a piece of work. Rust adds one rule that surprises everyone: the last expression is the return value, with no semicolon.",
    minutes: 14,
    group: "Basics",
    body: () => sections([
      {
        title: "Declaring one",
        html: `<p>Every parameter needs a type and the return type follows an arrow. Nothing is inferred across a function boundary, which is why the signature alone tells you how to call it.</p>
${sample(`fn main() {
    let total = add(3, 4);
    println!("add(3, 4) = {total}");
}

fn add(a: i32, b: i32) -> i32 {
    a + b
}`, { label: "src/main.rs", out: "add(3, 4) = 7" })}
<p>Look at the body of <code>add</code>. There is no <code>return</code> and no semicolon. The expression <code>a + b</code> is the last thing in the block, so it is the value of the block, and the block is the function body.</p>`,
      },
      {
        title: "Expression versus statement",
        html: `<p>An expression produces a value. A statement does not. A semicolon turns an expression into a statement, which is exactly why adding one to the last line breaks the function.</p>
${sample(`fn add(a: i32, b: i32) -> i32 {
    a + b;
}`, { label: "src/main.rs", run: false, tag: "does not compile", note: "With the semicolon the body evaluates to <code>()</code>, the empty tuple, and the compiler reports <code>expected `i32`, found `()`</code>." })}
<p>This is the most common early error in Rust, and the message names the fix. Remove the semicolon.</p>`,
      },
      {
        title: "Early return is still available",
        html: `<p>For guard clauses, <code>return</code> reads better than a deeply nested expression.</p>
${sample(`fn main() {
    println!("{}", describe(0));
    println!("{}", describe(-3));
    println!("{}", describe(8));
}

fn describe(value: i32) -> &'static str {
    if value < 0 {
        return "negative";
    }
    if value == 0 {
        return "zero";
    }
    "positive"
}`, { label: "src/main.rs", out: "zero\nnegative\npositive" })}
<p><code>&amp;'static str</code> means a borrowed string that lives for the whole program. String literals are always that, so returning one needs no allocation.</p>`,
      },
      {
        title: "Functions that change their argument",
        html: `<p>By default a function cannot change what you pass it. To allow it, the parameter must be a mutable reference and the caller must pass one.</p>
${sample(`fn main() {
    let mut log = String::from("start");
    append(&mut log, "middle");
    append(&mut log, "end");
    println!("{log}");
}

fn append(target: &mut String, piece: &str) {
    target.push('-');
    target.push_str(piece);
}`, { label: "src/main.rs", out: "start-middle-end" })}
<p>The <code>&amp;mut</code> in the signature is a visible warning at the call site that this call can change your value. Lesson 7 covers the rules behind it.</p>`,
      },
      {
        title: "Functions that return nothing",
        html: `<p>Omit the arrow. The return type is <code>()</code>, the unit type, and the function is called for its effect.</p>
${sample(`fn main() {
    greet("Ferris");
}

fn greet(name: &str) {
    println!("hello, {name}");
}`, { label: "src/main.rs", out: "hello, Ferris" })}`,
      },
    ]),
    exercise: {
      prompt:
        "Write <code>celsius_to_fahrenheit(c: f64) -&gt; f64</code> and <code>min_max(a: i32, b: i32) -&gt; (i32, i32)</code>, which returns the smaller value first. Print the conversions for 0, 100, and -40 as <code>0.0C = 32.0F</code>, then <code>min 3, max 9</code> for the inputs 9 and 3.",
      hint:
        "The formula is <code>c * 9.0 / 5.0 + 32.0</code>. For the second, compare the two values and return <code>(low, high)</code>. Both bodies are a single expression with no semicolon on the last line.",
      tips: [
        `There are two functions to finish, and each one can be a single expression. Do <code>celsius_to_fahrenheit</code> first and run the checker to see it pass that half.`,
        `The conversion is the usual one: multiply by 9, divide by 5, add 32. Keep the decimal points on the numbers (<code>9.0</code>, <code>5.0</code>, <code>32.0</code>) because the parameter is an <code>f64</code>.`,
        `For <code>min_max</code>, compare <code>a</code> and <code>b</code> with an <code>if</code>. Return <code>(a, b)</code> when <code>a &lt; b</code>, and <code>(b, a)</code> otherwise. A block used as an expression can be the whole function body.`,
      ],
      requires: "fn celsius_to_fahrenheit(c: f64) -> f64\nfn min_max(a: i32, b: i32) -> (i32, i32)",
      starter: `fn main() {
    for c in [0.0, 100.0, -40.0] {
        println!("{c:.1}C = {:.1}F", celsius_to_fahrenheit(c));
    }

    let (low, high) = min_max(9, 3);
    println!("min {low}, max {high}");
}

fn celsius_to_fahrenheit(c: f64) -> f64 {
    0.0
}

fn min_max(a: i32, b: i32) -> (i32, i32) {
    (a, b)
}`,
      expected: `0.0C = 32.0F
100.0C = 212.0F
-40.0C = -40.0F
min 3, max 9`,
      solution: `fn main() {
    for c in [0.0, 100.0, -40.0] {
        println!("{c:.1}C = {:.1}F", celsius_to_fahrenheit(c));
    }

    let (low, high) = min_max(9, 3);
    println!("min {low}, max {high}");
}

fn celsius_to_fahrenheit(c: f64) -> f64 {
    c * 9.0 / 5.0 + 32.0
}

fn min_max(a: i32, b: i32) -> (i32, i32) {
    if a < b {
        (a, b)
    } else {
        (b, a)
    }
}`,
    },
  },

  {
    slug: "conditionals-and-loops",
    title: "Decisions and repetition",
    lede:
      "if is an expression, loops return values, and there is no do-while to trip over. The control flow is small enough to learn in one sitting.",
    minutes: 15,
    group: "Basics",
    body: () => sections([
      {
        title: "if is an expression",
        html: `<p>The condition must be a real <code>bool</code>. There is no truthiness, so <code>if count</code> is an error where <code>if count &gt; 0</code> is not.</p>
${sample(`fn main() {
    let parts = 12;

    if parts == 0 {
        println!("empty shelf");
    } else if parts < 10 {
        println!("running low");
    } else {
        println!("stocked");
    }
}`, { label: "src/main.rs", out: "stocked" })}
<p>Because <code>if</code> is an expression, it can produce a value, which makes this legal and idiomatic:</p>
${sample(`fn main() {
    let parts = 12;
    let status = if parts > 0 { "stocked" } else { "empty" };
    println!("{status}");
}`, { label: "src/main.rs", out: "stocked" })}
<p>Both branches must produce the same type, or the compiler cannot know what <code>status</code> is.</p>`,
      },
      {
        title: "for over a range",
        html: `<p><code>for</code> walks anything iterable. A range with two dots excludes the end, three dots includes it.</p>
${sample(`fn main() {
    for step in 1..4 {
        println!("step {step}");
    }

    for step in 1..=3 {
        println!("inclusive {step}");
    }
}`, { label: "src/main.rs", out: "step 1\nstep 2\nstep 3\ninclusive 1\ninclusive 2\ninclusive 3" })}
<p>Prefer <code>for</code> over indexing. It cannot run off the end of the collection, and it reads as what you mean.</p>`,
      },
      {
        title: "while, and loop",
        html: `<p><code>while</code> repeats while a condition holds. <code>loop</code> repeats until you break, and it can return a value from the break.</p>
${sample(`fn main() {
    let mut countdown = 3;
    while countdown > 0 {
        println!("{countdown}");
        countdown -= 1;
    }
    println!("liftoff");

    let mut attempts = 0;
    let answer = loop {
        attempts += 1;
        if attempts == 3 {
            break attempts * 10;
        }
    };
    println!("answer {answer} after {attempts} attempts");
}`, { label: "src/main.rs", out: "3\n2\n1\nliftoff\nanswer 30 after 3 attempts" })}
<p><code>break value</code> is how <code>loop</code> hands back a result, which is handy when the exit condition is discovered in the middle of the body.</p>`,
      },
      {
        title: "Iterating a collection",
        html: `<p>Iterating an array by value gives you copies of the elements. Iterating with <code>.iter()</code> gives you references, and <code>.iter_mut()</code> gives you mutable references.</p>
${sample(`fn main() {
    let numbers = [10, 20, 30];

    for number in numbers {
        println!("value {number}");
    }

    let mut totals = [0, 0, 0];
    for slot in totals.iter_mut() {
        *slot += 5;
    }
    println!("{:?}", totals);
}`, { label: "src/main.rs", out: "value 10\nvalue 20\nvalue 30\n[5, 5, 5]" })}
<p>The star in <code>*slot += 5</code> follows the reference to the value behind it. Lesson 7 explains what that means.</p>`,
      },
      {
        title: "Leaving early",
        html: `<p><code>break</code> leaves the nearest loop, <code>continue</code> skips to the next round, and labels let you target an outer loop when loops nest.</p>
${sample(`fn main() {
    'rows: for row in 1..=3 {
        for column in 1..=3 {
            if row * column == 4 {
                println!("found 4 at row {row}, column {column}");
                break 'rows;
            }
        }
    }
}`, { label: "src/main.rs", out: "found 4 at row 2, column 2" })}`,
      },
    ]),
    exercise: {
      prompt:
        "Write <code>fn fizzbuzz(n: u32) -&gt; String</code> that returns <code>fizzbuzz</code>, <code>fizz</code>, <code>buzz</code>, or the number as text. Then print the answers for 1 to 15. The checker calls your function with numbers up to 5000.",
      hint:
        "Match on the pair <code>(n % 3, n % 5)</code> with arms <code>(0, 0)</code>, <code>(0, _)</code>, <code>(_, 0)</code>, and <code>_</code>. Return <code>String::from(...)</code> for the words and <code>n.to_string()</code> for the rest.",
      tips: [
        `The <code>for</code> loop in <code>main</code> is already correct. Your job is the body of <code>fizzbuzz</code>: return the word, do not print it.`,
        `A number is a fizzbuzz when it divides by both 3 and 5, so test that case first. If you test 3 first, 15 returns <code>fizz</code> too early.`,
        `A <code>match</code> on the pair <code>(n % 3, n % 5)</code> handles all four cases at once. Put the <code>(0, 0)</code> arm first; the compiler checks every arm returns a <code>String</code>.`,
      ],
      requires: "fn fizzbuzz(n: u32) -> String",
      starter: `fn main() {
    for n in 1..=15 {
        println!("{}", fizzbuzz(n));
    }
}

fn fizzbuzz(n: u32) -> String {
    // Return the word, not print it.
    n.to_string()
}`,
      expected: `1
2
fizz
4
buzz
fizz
7
8
fizz
buzz
11
fizz
13
14
fizzbuzz`,
      solution: `fn main() {
    for n in 1..=15 {
        println!("{}", fizzbuzz(n));
    }
}

fn fizzbuzz(n: u32) -> String {
    match (n % 3, n % 5) {
        (0, 0) => String::from("fizzbuzz"),
        (0, _) => String::from("fizz"),
        (_, 0) => String::from("buzz"),
        _ => n.to_string(),
    }
}`,
    },
  },

  {
    slug: "ownership",
    title: "Ownership: who holds the value",
    lede:
      "Every value has exactly one owner. When the owner goes out of scope the value is freed. This is the idea the rest of Rust is built on.",
    minutes: 18,
    group: "Ownership",
    body: () => sections([
      {
        title: "The problem ownership solves",
        html: `<p>In a language with manual memory management you must free what you allocate, and forgetting is a leak while freeing twice is a crash. In a language with a garbage collector, something else decides for you and you pay for it at runtime.</p>
<p>Rust takes a third route. The compiler tracks which variable owns each value, inserts the free at the right moment, and rejects programs where two places would both think they own the same thing. There is no runtime cost and no collector.</p>`,
      },
      {
        title: "A move transfers ownership",
        html: `<p>Assigning a <code>String</code> to another binding moves it. The first binding is no longer usable, and the compiler enforces that.</p>
${sample(`fn main() {
    let greeting = String::from("hello");
    let moved = greeting;

    println!("{moved}");
}`, { label: "src/main.rs", out: "hello" })}
<p>Now try using <code>greeting</code> after the move:</p>
${sample(`fn main() {
    let greeting = String::from("hello");
    let moved = greeting;

    println!("{greeting}");
}`, { label: "src/main.rs", run: false, tag: "does not compile", note: "The error is <code>E0382: borrow of moved value</code>. The compiler points at the line that moved it and the line that tried to use it, so the two places are always visible together." })}
<p>Why forbid it? A <code>String</code> is a pointer, a length, and a capacity on the stack, pointing at bytes on the heap. Copying those three words would leave two owners of one allocation, and both would free it at the end of the function. Rust moves instead of copying, so there is exactly one owner.</p>`,
      },
      {
        title: "Simple values copy",
        html: `<p>Integers, floats, booleans, and chars live entirely on the stack, so copying them is cheap and safe. These types implement a trait called <code>Copy</code>, and assignment copies rather than moves.</p>
${sample(`fn main() {
    let number = 42;
    let also_number = number;

    println!("number: {number}");
    println!("also_number: {also_number}");
}`, { label: "src/main.rs", out: "number: 42\nalso_number: 42" })}
<p>The practical rule: if a type owns heap memory, it moves. If it is a fixed-size value, it copies.</p>`,
      },
      {
        title: "Passing to a function moves too",
        html: `<p>The same rule applies at call boundaries. Passing a <code>String</code> by value hands ownership to the function, and the caller cannot use it afterwards.</p>
${sample(`fn main() {
    let report = String::from("all parts accounted for");
    consume(report);
    // report is no longer usable here
}

fn consume(text: String) {
    println!("consumed: {text}");
}`, { label: "src/main.rs", out: "consumed: all parts accounted for" })}
<p>You have three ways to keep using the value: pass a reference instead (next lesson), return ownership back from the function, or clone it if a copy is genuinely what you want.</p>
${sample(`fn main() {
    let report = String::from("all parts accounted for");
    let report = hand_back(report);
    println!("still mine: {report}");
}

fn hand_back(text: String) -> String {
    println!("checked: {text}");
    text
}`, { label: "src/main.rs", out: "checked: all parts accounted for\nstill mine: all parts accounted for" })}
<p>Returning the value back works, but you will quickly find it clumsy, which is exactly why references exist.</p>`,
      },
      {
        title: "clone when you mean a copy",
        html: `<p><code>.clone()</code> makes a real, independent duplicate. It is not a bug to use it, but every clone is an allocation, so it should be a decision and not a reflex.</p>
${sample(`fn main() {
    let original = String::from("blueprint");
    let duplicate = original.clone();

    println!("original: {original}");
    println!("duplicate: {duplicate}");
}`, { label: "src/main.rs", out: "original: blueprint\nduplicate: blueprint" })}
${callout("note", "Scope ends, value drops", `<p>When a function ends, every value it owns is dropped in reverse order of declaration. That is where the free happens, and you never write it.</p>`)}`,
      },
    ]),
    exercise: {
      prompt:
        "Write <code>fn shout(mut text: String) -&gt; String</code> that appends <code>!</code> and returns the string. Start with <code>String::from(\"hello\")</code>, call <code>shout</code> twice in a row, reassigning the result each time, and print <code>hello!!</code>.",
      hint:
        "Use <code>text.push('!');</code> and then <code>text</code> as the last expression, with no semicolon. Reassign with <code>let message = shout(message);</code> after each call. The checker passes in strings you have not seen.",
      tips: [
        `The <code>main</code> function already calls <code>shout</code> twice and prints the result. Only the body of <code>shout</code> needs to change.`,
        `The parameter is already <code>mut text: String</code>, so you can change it in place. <code>text.push('!');</code> adds one character.`,
        `After the <code>push</code>, put <code>text</code> on the last line without a semicolon. That hands ownership back to the caller, which is why <code>main</code> can assign the result to <code>message</code> again.`,
      ],
      requires: "fn shout(mut text: String) -> String",
      starter: `fn main() {
    let message = String::from("hello");

    let message = shout(message);
    let message = shout(message);

    println!("{message}");
}

fn shout(mut text: String) -> String {
    // Append one exclamation mark and return the string.
    text
}`,
      expected: `hello!!`,
      solution: `fn main() {
    let message = String::from("hello");

    let message = shout(message);
    let message = shout(message);

    println!("{message}");
}

fn shout(mut text: String) -> String {
    text.push('!');
    text
}`,
    },
  },

  {
    slug: "borrowing",
    title: "Borrowing instead of moving",
    lede:
      "A reference lets a function read or change a value without taking ownership of it. The rules are two lines long, and they prevent data races at compile time.",
    minutes: 17,
    group: "Ownership",
    body: () => sections([
      {
        title: "A reference borrows",
        html: `<p><code>&amp;value</code> creates a reference. The owner keeps the value, and the reference is only allowed to exist for a while.</p>
${sample(`fn main() {
    let report = String::from("all parts accounted for");
    let length = measure(&report);

    println!("length: {length}");
    println!("still usable: {report}");
}

fn measure(text: &str) -> usize {
    text.len()
}`, { label: "src/main.rs", out: "length: 23\nstill usable: all parts accounted for" })}
<p><code>measure</code> takes <code>&amp;str</code>, and <code>&amp;report</code> is a <code>&amp;String</code>. That works because <code>&amp;String</code> coerces to <code>&amp;str</code>, which is why library functions prefer <code>&amp;str</code>: it accepts both a literal and a <code>String</code>.</p>`,
      },
      {
        title: "A mutable reference can change it",
        html: `<p><code>&amp;mut</code> gives read and write access. The caller must pass a mutable reference too, so the change is visible at the call site.</p>
${sample(`fn main() {
    let mut log = String::from("start");
    append(&mut log, "middle");
    println!("{log}");
}

fn append(target: &mut String, piece: &str) {
    target.push('-');
    target.push_str(piece);
}`, { label: "src/main.rs", out: "start-middle" })}
<p>Inside the function you do not need to dereference to call a method. Rust inserts that for you.</p>`,
      },
      {
        title: "The two rules",
        html: `<p>At any moment, a value can have either:</p>
<ul>
  <li>any number of immutable references, or</li>
  <li>exactly one mutable reference,</li>
</ul>
<p>but never both at once. This is checked when you compile, and it is what makes Rust safe without a runtime check.</p>
${sample(`fn main() {
    let mut text = String::from("hello");

    let first = &text;
    let second = &text;
    println!("{first} {second}");

    let editor = &mut text;
    editor.push_str(" there");
    println!("{editor}");
}`, { label: "src/main.rs", out: "hello hello\nhello there" })}
<p>That compiles because the immutable borrows are finished before the mutable one starts. This does not:</p>
${sample(`fn main() {
    let mut text = String::from("hello");
    let reader = &text;
    let editor = &mut text;

    println!("{reader} {editor}");
}`, { label: "src/main.rs", run: false, tag: "does not compile", note: "The error is <code>E0502: cannot borrow as mutable because it is also borrowed as immutable</code>. Reading and writing the same memory at the same time is the bug this rule removes." })}`,
      },
      {
        title: "Why the rule is worth it",
        html: `<p>An immutable borrow promises the value will not change while it is held. A mutable borrow promises nobody else is looking. Together they mean a reference can never be invalidated underneath you, which is the dangling pointer problem, solved before the program runs.</p>
<p>In practice you will hit these errors when you try to hold a reference across a loop that also mutates the collection. The fix is almost always to finish using the reference before mutating, or to collect what you need into a new variable first.</p>`,
      },
      {
        title: "Slices",
        html: `<p>A slice is a reference to part of a collection. <code>&amp;text[0..5]</code> is the first five bytes, and <code>&amp;items[1..]</code> is everything from the second element on.</p>
${sample(`fn main() {
    let text = String::from("workshop");
    let first = &text[0..4];
    let rest = &text[4..];

    println!("{first} + {rest}");

    let numbers = [3, 8, 13, 21];
    let tail = &numbers[2..];
    println!("{:?}", tail);
}`, { label: "src/main.rs", out: "work + shop\n[13, 21]" })}
${callout("note", "Careful with text indexes", `<p>String slices are byte offsets, and a multi-byte character will panic if you cut it in half. For text you did not write yourself, use <code>.chars()</code> instead of slicing.</p>`)}`,
      },
      {
        title: "When a reference comes back out",
        html: `<p>A function that returns a reference has to tell the compiler which input it borrows from. Usually you never write that down, because elision fills it in: one input reference means the output borrows from that one.</p>
${sample(`fn first_word(text: &str) -> &str {
    text.split_whitespace().next().unwrap_or("")
}

fn main() {
    println!("{}", first_word("parts on the bench"));
}`, { label: "src/main.rs", out: "parts" })}
<p>Two input references and one output is the case elision cannot guess. You name the lifetime, and the name is a promise that the returned reference lives no longer than the shortest of the inputs.</p>
${sample(`fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() {
        a
    } else {
        b
    }
}

fn main() {
    println!("{}", longest("ferris", "crab"));
}`, { label: "src/main.rs", out: "ferris" })}
<p>Read <code>&#39;a</code> as "some region of the program". The signature does not create a region; it says both arguments and the result must fit inside the same one. Callers never write the lifetime, because the compiler picks the region from how you use the result.</p>
${callout("note", "The error is the lesson", `<p>Drop the <code>&lt;&#39;a&gt;</code> and the compiler answers <code>E0106: missing lifetime specifier</code>, then suggests the exact signature you need. You will meet this error the first time you write a function like this, and the fix is always the same shape.</p>`)}`,
      },
    ]),
    exercise: {
      prompt:
        "Write <code>fn longest(a: &amp;str, b: &amp;str) -&gt; &amp;str</code> that returns whichever is longer. The signature in the starter is incomplete; the compiler will tell you what is missing. Call it with <code>\"ferris\"</code> and <code>\"crab\"</code>, then with <code>\"claw\"</code> and <code>\"shell\"</code>, and print both results.",
      hint:
        "Two input references and one output means you name the lifetime: <code>fn longest&lt;'a&gt;(a: &amp;'a str, b: &amp;'a str) -&gt; &amp;'a str</code>. The compiler error <code>E0106</code> prints that signature for you. Then compare <code>a.len()</code> and <code>b.len()</code>. The checker swaps the argument order too.",
      tips: [
        `Press Check with the starter as it is. The compiler will refuse the signature and quote the exact one you need; reading that error is part of the exercise.`,
        `The missing piece is a lifetime. Add <code>&lt;'a&gt;</code> after the function name, and put <code>'a</code> after each <code>&amp;</code> in the parameters and the return type.`,
        `For the body, compare <code>a.len()</code> and <code>b.len()</code>. Return <code>a</code> when it is longer or the same length, and <code>b</code> otherwise. No lifetime annotation is needed inside the body.`,
      ],
      requires: "fn longest<'a>(a: &'a str, b: &'a str) -> &'a str",
      starter: `fn main() {
    println!("{}", longest("ferris", "crab"));
    println!("{}", longest("claw", "shell"));
}

// This signature is missing something. Run the checker and read the error.
fn longest(a: &str, b: &str) -> &str {
    a
}`,
      expected: `ferris
shell`,
      solution: `fn main() {
    println!("{}", longest("ferris", "crab"));
    println!("{}", longest("claw", "shell"));
}

fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() {
        a
    } else {
        b
    }
}`,
    },
  },

  {
    slug: "structs",
    title: "Structs and methods",
    lede:
      "A struct names a group of related values. An impl block attaches behavior to it. Together they are how you model a real thing in Rust.",
    minutes: 16,
    group: "Data",
    body: () => sections([
      {
        title: "Defining and building one",
        html: `<p>Fields are named and typed. Build a value with the same names, in any order.</p>
${sample(`struct Part {
    name: String,
    quantity: u32,
    price: f64,
}

fn main() {
    let bolt = Part {
        name: String::from("M6 bolt"),
        quantity: 40,
        price: 0.12,
    };

    println!("{} x{} at {:.2}", bolt.name, bolt.quantity, bolt.price);
}`, { label: "src/main.rs", out: "M6 bolt x40 at 0.12" })}
<p>Field access is a dot. There are no getters to write unless you want validation.</p>`,
      },
      {
        title: "Deriving Debug",
        html: `<p>Add <code>#[derive(Debug)]</code> above the struct and you can print the whole value with <code>{:?}</code>. It costs nothing at runtime and it is the first thing to add while building.</p>
${sample(`#[derive(Debug)]
struct Part {
    name: String,
    quantity: u32,
}

fn main() {
    let bolt = Part {
        name: String::from("M6 bolt"),
        quantity: 40,
    };

    println!("{:?}", bolt);
    println!("{:#?}", bolt);
}`, { label: "src/main.rs", out: 'Part { name: "M6 bolt", quantity: 40 }\nPart {\n    name: "M6 bolt",\n    quantity: 40,\n}' })}
<p><code>{:#?}</code> is the pretty version, one field per line.</p>`,
      },
      {
        title: "Methods",
        html: `<p>An <code>impl</code> block holds functions that belong to the type. A method takes <code>&amp;self</code> to read, <code>&amp;mut self</code> to change, or <code>self</code> to consume.</p>
${sample(`#[derive(Debug)]
struct Part {
    name: String,
    quantity: u32,
    price: f64,
}

impl Part {
    fn value(&self) -> f64 {
        self.quantity as f64 * self.price
    }

    fn restock(&mut self, amount: u32) {
        self.quantity += amount;
    }
}

fn main() {
    let mut bolt = Part {
        name: String::from("M6 bolt"),
        quantity: 40,
        price: 0.12,
    };

    println!("value: {:.2}", bolt.value());
    bolt.restock(10);
    println!("{:?}", bolt);
}`, { label: "src/main.rs", out: 'value: 4.80\nPart { name: "M6 bolt", quantity: 50, price: 0.12 }' })}
<p><code>restock</code> needs <code>&amp;mut self</code> because it changes a field, and <code>bolt</code> has to be declared <code>mut</code>. The compiler will tell you both facts if you forget.</p>`,
      },
      {
        title: "Associated functions",
        html: `<p>A function in an <code>impl</code> block without <code>self</code> is called on the type, not on a value. <code>Part::new(...)</code> is the conventional constructor, because Rust has no constructor keyword.</p>
${sample(`#[derive(Debug)]
struct Part {
    name: String,
    quantity: u32,
    price: f64,
}

impl Part {
    fn new(name: &str, quantity: u32, price: f64) -> Self {
        Self {
            name: name.to_string(),
            quantity,
            price,
        }
    }

    fn value(&self) -> f64 {
        self.quantity as f64 * self.price
    }
}

fn main() {
    let bolt = Part::new("M6 bolt", 40, 0.12);
    println!("{} costs {:.2}", bolt.name, bolt.value());
}`, { label: "src/main.rs", out: "M6 bolt costs 4.80" })}
<p><code>Self</code> means the type the impl block is for. The shorthand <code>quantity,</code> fills the field of the same name from the parameter, which keeps constructors short.</p>`,
      },
      {
        title: "Updating a struct",
        html: `<p>Struct update syntax builds a new value from an old one, taking the remaining fields by move.</p>
${sample(`#[derive(Debug, Clone)]
struct Settings {
    theme: String,
    font_size: u32,
    line_numbers: bool,
}

fn main() {
    let base = Settings {
        theme: String::from("dark"),
        font_size: 14,
        line_numbers: true,
    };

    let larger = Settings {
        font_size: 18,
        ..base.clone()
    };

    println!("{:?}", larger);
}`, { label: "src/main.rs", out: 'Settings { theme: "dark", font_size: 18, line_numbers: true }' })}`,
      },
    ]),
    exercise: {
      prompt:
        "Model a <code>Book</code> with public fields <code>title</code>, <code>author</code>, and <code>pages</code>. Add <code>Book::new</code> and a method <code>reading_time</code> that returns minutes at 2 pages per minute. Create <code>The Hobbit</code> by <code>Tolkien</code> with 310 pages and print <code>The Hobbit by Tolkien: 155.0 minutes</code>.",
      hint:
        "Divide as <code>f64</code>: <code>self.pages as f64 / 2.0</code>. The constructor takes <code>&amp;str</code> parameters and builds <code>String</code> fields with <code>.to_string()</code>. Fields are private by default, so write <code>pub</code> in front of each one.",
      tips: [
        `The struct, the <code>pub</code> fields, and <code>Book::new</code> are already written. You only need to fill in <code>reading_time</code>.`,
        `The method already receives <code>&amp;self</code>, so reach the field with <code>self.pages</code>. Pages is a <code>u32</code> and the return type is <code>f64</code>, so convert with <code>self.pages as f64</code>.`,
        `At two pages per minute, divide the page count by <code>2.0</code>. Keep the decimal point so the division stays floating point: <code>self.pages as f64 / 2.0</code>.`,
      ],
      requires: "struct Book with pub title, pub author, pub pages\nBook::new(title: &str, author: &str, pages: u32) -> Book\nfn reading_time(&self) -> f64",
      starter: `struct Book {
    pub title: String,
    pub author: String,
    pub pages: u32,
}

impl Book {
    fn new(title: &str, author: &str, pages: u32) -> Book {
        Book {
            title: title.to_string(),
            author: author.to_string(),
            pages,
        }
    }

    fn reading_time(&self) -> f64 {
        0.0
    }
}

fn main() {
    let book = Book::new("The Hobbit", "Tolkien", 310);
    println!(
        "{} by {}: {:.1} minutes",
        book.title,
        book.author,
        book.reading_time()
    );
}`,
      expected: `The Hobbit by Tolkien: 155.0 minutes`,
      solution: `struct Book {
    pub title: String,
    pub author: String,
    pub pages: u32,
}

impl Book {
    fn new(title: &str, author: &str, pages: u32) -> Book {
        Book {
            title: title.to_string(),
            author: author.to_string(),
            pages,
        }
    }

    fn reading_time(&self) -> f64 {
        self.pages as f64 / 2.0
    }
}

fn main() {
    let book = Book::new("The Hobbit", "Tolkien", 310);
    println!(
        "{} by {}: {:.1} minutes",
        book.title,
        book.author,
        book.reading_time()
    );
}`,
    },
  },

  {
    slug: "enums-and-match",
    title: "Enums, match, and Option",
    lede:
      "An enum says a value is one of several things. match makes you handle every one of them. Together they replace null and most boolean flags.",
    minutes: 18,
    group: "Data",
    body: () => sections([
      {
        title: "Variants can carry data",
        html: `<p>Each variant is a distinct shape, and each can hold different data. That is more than a C enum, which is just a number.</p>
${sample(`#[derive(Debug)]
enum Shape {
    Circle(f64),
    Rectangle { width: f64, height: f64 },
    Point,
}

fn main() {
    let shapes = [
        Shape::Circle(1.5),
        Shape::Rectangle { width: 2.0, height: 3.0 },
        Shape::Point,
    ];

    for shape in &shapes {
        println!("{:?}", shape);
    }
}`, { label: "src/main.rs", out: "Circle(1.5)\nRectangle { width: 2.0, height: 3.0 }\nPoint" })}
<p>One type, three possible shapes, and the compiler knows all of them. That knowledge is what makes <code>match</code> powerful.</p>`,
      },
      {
        title: "match handles every variant",
        html: `<p><code>match</code> compares a value against patterns and runs the first one that fits. It must be exhaustive, so a new variant becomes a compile error everywhere it is not handled.</p>
${sample(`#[derive(Debug)]
enum Shape {
    Circle(f64),
    Rectangle { width: f64, height: f64 },
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle(radius) => 3.141_592_653 * radius * radius,
            Shape::Rectangle { width, height } => width * height,
        }
    }
}

fn main() {
    let shapes = [
        Shape::Circle(1.5),
        Shape::Rectangle { width: 2.0, height: 3.0 },
    ];

    for shape in &shapes {
        println!("{:?} has area {:.3}", shape, shape.area());
    }
}`, { label: "src/main.rs", out: "Circle(1.5) has area 7.069\nRectangle { width: 2.0, height: 3.0 } has area 6.000" })}
<p>Patterns bind the data out of the variant, so <code>radius</code> and the two fields are usable directly in the arm.</p>`,
      },
      {
        title: "Option replaces null",
        html: `<p>There is no null in Rust. A value that might be missing has type <code>Option&lt;T&gt;</code>, which is either <code>Some(value)</code> or <code>None</code>. The compiler will not let you use the value without handling the missing case.</p>
${sample(`fn find_part(name: &str) -> Option<u32> {
    if name == "bolt" {
        Some(40)
    } else {
        None
    }
}

fn main() {
    match find_part("bolt") {
        Some(count) => println!("found {count}"),
        None => println!("not in stock"),
    }

    match find_part("gear") {
        Some(count) => println!("found {count}"),
        None => println!("not in stock"),
    }
}`, { label: "src/main.rs", out: "found 40\nnot in stock" })}
<p>Every place that can be empty is marked in the type. There is no way to forget to check, because forgetting means the code does not compile.</p>`,
      },
      {
        title: "The shortcuts worth knowing",
        html: `<p>Three methods cover most everyday uses of <code>Option</code>.</p>
${sample(`fn main() {
    let maybe: Option<u32> = Some(7);

    println!("{}", maybe.unwrap_or(0));
    println!("{}", maybe.map(|value| value * 2).unwrap_or(0));

    let missing: Option<u32> = None;
    println!("{}", missing.unwrap_or(0));

    if let Some(value) = maybe {
        println!("present: {value}");
    }
}`, { label: "src/main.rs", out: "7\n14\n0\npresent: 7" })}
<p><code>unwrap_or</code> supplies a fallback. <code>map</code> transforms the value inside without leaving the <code>Option</code>. <code>if let</code> handles one variant and ignores the rest, which is shorter than a full <code>match</code> when only one arm matters.</p>
${callout("note", "About unwrap", `<p><code>.unwrap()</code> panics on <code>None</code>. That is fine in a test or a prototype, and it is a real bug in a program people use. Prefer <code>unwrap_or</code>, <code>unwrap_or_else</code>, or a <code>match</code>.</p>`)}`,
      },
      {
        title: "match on anything",
        html: `<p><code>match</code> is not limited to enums. Ranges, literals, and guards work too, and the arms are checked for order.</p>
${sample(`fn main() {
    for score in [0, 42, 78, 95, 101] {
        let grade = match score {
            0 => "nothing",
            1..=59 => "needs work",
            60..=89 => "solid",
            90..=100 => "excellent",
            other => {
                println!("{other} is out of range");
                "unknown"
            }
        };
        println!("{score}: {grade}");
    }
}`, { label: "src/main.rs", out: "0: nothing\n42: needs work\n78: solid\n95: excellent\n101 is out of range\n101: unknown" })}`,
      },
    ]),
    exercise: {
      prompt:
        "Define <code>enum TrafficLight</code> with <code>Red</code>, <code>Green</code>, and <code>Yellow</code>, plus <code>fn next(self) -&gt; TrafficLight</code> and <code>fn name(self) -&gt; &amp;'static str</code> returning <code>red</code>, <code>green</code>, or <code>yellow</code>. Start at <code>Red</code>, advance a mutable variable, and print four lines.",
      hint:
        "Match on <code>self</code> in both methods. Derive <code>Copy, Clone</code> so the value can be used after a call. The checker asks for <code>Red.next().next()</code>, so <code>next</code> must return an owned light rather than a reference.",
      tips: [
        `The enum, the <code>#[derive(Copy, Clone)]</code>, and the <code>main</code> loop are already correct. Fill in <code>next</code> and <code>name</code>.`,
        `In <code>next</code>, match on <code>self</code> and return the following variant: <code>Red</code> to <code>Green</code>, <code>Green</code> to <code>Yellow</code>, and <code>Yellow</code> back to <code>Red</code>.`,
        `In <code>name</code>, match on <code>self</code> and return a plain string literal: <code>"red"</code>, <code>"green"</code>, or <code>"yellow"</code>. Do not print; the caller prints.`,
      ],
      requires: "enum TrafficLight { Red, Green, Yellow }\nfn next(self) -> TrafficLight\nfn name(self) -> &'static str",
      starter: `#[derive(Copy, Clone)]
enum TrafficLight {
    Red,
    Green,
    Yellow,
}

impl TrafficLight {
    fn next(self) -> TrafficLight {
        // Red -> Green -> Yellow -> Red
        self
    }

    fn name(self) -> &'static str {
        // "red", "green", "yellow"
        "red"
    }
}

fn main() {
    let mut light = TrafficLight::Red;
    for _ in 0..4 {
        println!("{}", light.name());
        light = light.next();
    }
}`,
      expected: `red
green
yellow
red`,
      solution: `#[derive(Copy, Clone)]
enum TrafficLight {
    Red,
    Green,
    Yellow,
}

impl TrafficLight {
    fn next(self) -> TrafficLight {
        match self {
            TrafficLight::Red => TrafficLight::Green,
            TrafficLight::Green => TrafficLight::Yellow,
            TrafficLight::Yellow => TrafficLight::Red,
        }
    }

    fn name(self) -> &'static str {
        match self {
            TrafficLight::Red => "red",
            TrafficLight::Green => "green",
            TrafficLight::Yellow => "yellow",
        }
    }
}

fn main() {
    let mut light = TrafficLight::Red;
    for _ in 0..4 {
        println!("{}", light.name());
        light = light.next();
    }
}`,
    },
  },

  {
    slug: "collections",
    title: "Vectors and strings",
    lede:
      "Two growable collections cover most programs: a list of values, and text you build at runtime. Both own their contents and both are used constantly.",
    minutes: 17,
    group: "Data",
    body: () => sections([
      {
        title: "Creating a vector",
        html: `<p><code>Vec&lt;T&gt;</code> is a growable array on the heap. The <code>vec!</code> macro is the shortest way to build one.</p>
${sample(`fn main() {
    let mut scores = vec![72, 88, 95];
    scores.push(61);
    scores.push(100);

    println!("{:?}", scores);
    println!("count: {}", scores.len());
    println!("first: {:?}", scores.first());
    println!("last: {:?}", scores.last());
}`, { label: "src/main.rs", out: "[72, 88, 95, 61, 100]\ncount: 5\nfirst: Some(72)\nlast: Some(100)" })}
<p><code>first()</code> and <code>last()</code> return <code>Option</code>, because an empty vector has neither. Indexing with <code>scores[0]</code> panics on an empty vector instead, which is why the methods are usually the better choice.</p>`,
      },
      {
        title: "Looping and computing",
        html: `<p>Iterators turn a loop into an expression. <code>sum</code>, <code>max</code>, and <code>filter</code> are the ones you will reach for first.</p>
${sample(`fn main() {
    let scores = vec![72, 88, 95, 61];

    let total: i32 = scores.iter().sum();
    let average = total as f64 / scores.len() as f64;
    println!("total {total}, average {average:.1}");

    let passed: Vec<&i32> = scores.iter().filter(|score| **score >= 70).collect();
    println!("passed: {:?}", passed);

    if let Some(best) = scores.iter().max() {
        println!("best: {best}");
    }
}`, { label: "src/main.rs", out: "total 316, average 79.0\npassed: [72, 88, 95]\nbest: 95" })}
<p><code>.iter()</code> gives references, so the filter closure receives <code>&amp;&amp;i32</code> and needs two stars. <code>collect()</code> gathers the result into whatever type you annotated.</p>`,
      },
      {
        title: "Strings are bytes with rules",
        html: `<p><code>String</code> is a <code>Vec&lt;u8&gt;</code> that is guaranteed to be valid UTF-8. That guarantee is why you cannot index a string by number: one character can be several bytes.</p>
${sample(`fn main() {
    let mut title = String::from("rust");
    title.push_str(" for beginners");
    title.push('!');

    println!("{title}");
    println!("bytes: {}", title.len());
    println!("characters: {}", title.chars().count());
}`, { label: "src/main.rs", out: "rust for beginners!\nbytes: 19\ncharacters: 19" })}
<p>Both numbers agree here because the text is ASCII. Add an accented character and <code>len()</code> grows while <code>chars().count()</code> does not.</p>`,
      },
      {
        title: "Building text from parts",
        html: `<p><code>format!</code> returns a new <code>String</code> instead of printing. <code>join</code> glues a collection together, and <code>split</code> takes it apart.</p>
${sample(`fn main() {
    let parts = ["bolt", "nut", "washer"];
    let line = parts.join(", ");
    println!("{line}");

    let label = format!("{} parts: {}", parts.len(), line);
    println!("{label}");

    for word in line.split(", ") {
        println!("- {word}");
    }
}`, { label: "src/main.rs", out: "bolt, nut, washer\n3 parts: bolt, nut, washer\n- bolt\n- nut\n- washer" })}`,
      },
      {
        title: "Removing and checking",
        html: `<p><code>remove</code> takes an index and shifts the rest, <code>pop</code> takes the last and returns it, and <code>contains</code> checks membership.</p>
${sample(`fn main() {
    let mut queue = vec!["first", "second", "third"];

    let served = queue.remove(0);
    println!("served {served}, left {:?}", queue);

    let last = queue.pop();
    println!("popped {:?}, left {:?}", last, queue);

    println!("has second: {}", queue.contains(&"second"));
}`, { label: "src/main.rs", out: 'served first, left ["second", "third"]\npopped Some("third"), left ["second"]\nhas second: true' })}
${callout("note", "Capacity is not length", `<p>A vector tracks how many items it holds and how much room it has. <code>push</code> occasionally reallocates, which is why a <code>&amp;vec[0]</code> held across a push will not compile. That error is the borrow checker saving you from a dangling pointer.</p>`)}`,
      },
    ]),
    exercise: {
      prompt:
        "Given <code>vec![4, 8, 15, 16, 23, 42]</code>, print <code>[4, 8, 16, 42]</code>, then <code>sum: 70</code>, then the original vector. Both numbers come from <code>fn evens(numbers: &amp;[i32]) -&gt; Vec&lt;i32&gt;</code> and <code>fn even_sum(numbers: &amp;[i32]) -&gt; i32</code>, which the checker calls with other vectors.",
      hint:
        "Use <code>.iter().filter(|n| **n % 2 == 0).copied().collect::&lt;Vec&lt;i32&gt;&gt;()</code>, and sum with <code>.iter().sum::&lt;i32&gt;()</code>. Neither function takes ownership, which is why the original stays usable.",
      tips: [
        `The <code>main</code> function already prints everything in the right order. You only need to implement <code>evens</code> and <code>even_sum</code>.`,
        `Both functions receive a slice, <code>&amp;[i32]</code>, so iterate with <code>numbers.iter()</code>. Each item is <code>&amp;i32</code> inside the closure, which is why the check is <code>**n % 2 == 0</code>.`,
        `<code>.filter(...)</code> keeps the numbers that pass the test, <code>.copied()</code> turns <code>&amp;i32</code> back into <code>i32</code>, and <code>.collect()</code> builds the <code>Vec&lt;i32&gt;</code> the return type asks for.`,
        `For <code>even_sum</code>, reuse <code>evens(numbers)</code> and add up the result with <code>.iter().sum()</code>. Reusing the function you already wrote means one list of even numbers, not two separate rules.`,
      ],
      requires: "fn evens(numbers: &[i32]) -> Vec<i32>\nfn even_sum(numbers: &[i32]) -> i32",
      starter: `fn main() {
    let numbers = vec![4, 8, 15, 16, 23, 42];

    println!("{:?}", evens(&numbers));
    println!("sum: {}", even_sum(&numbers));
    println!("{:?}", numbers);
}

fn evens(numbers: &[i32]) -> Vec<i32> {
    Vec::new()
}

fn even_sum(numbers: &[i32]) -> i32 {
    0
}`,
      expected: `[4, 8, 16, 42]
sum: 70
[4, 8, 15, 16, 23, 42]`,
      solution: `fn main() {
    let numbers = vec![4, 8, 15, 16, 23, 42];

    println!("{:?}", evens(&numbers));
    println!("sum: {}", even_sum(&numbers));
    println!("{:?}", numbers);
}

fn evens(numbers: &[i32]) -> Vec<i32> {
    numbers.iter().filter(|n| **n % 2 == 0).copied().collect()
}

fn even_sum(numbers: &[i32]) -> i32 {
    evens(numbers).iter().sum()
}`,
    },
  },

  {
    slug: "errors",
    title: "Recoverable errors with Result",
    lede:
      "A failure you can do something about is a value, not an exception. Result carries either the answer or the reason, and the question mark passes it along.",
    minutes: 18,
    group: "Real programs",
    body: () => sections([
      {
        title: "Result is an enum",
        html: `<p><code>Result&lt;T, E&gt;</code> is <code>Ok(value)</code> on success and <code>Err(error)</code> on failure. Parsing text into a number is the cleanest example, because it fails all the time and never crashes.</p>
${sample(`fn main() {
    let good = "42".parse::<i32>();
    let bad = "forty two".parse::<i32>();

    println!("{:?}", good);
    println!("{:?}", bad);
}`, { label: "src/main.rs", out: 'Ok(42)\nErr(ParseIntError { kind: InvalidDigit })' })}
<p>Nothing panicked. The failure is a value you can inspect, store, or pass upward.</p>`,
      },
      {
        title: "Handling it with match",
        html: `<p>The explicit version is a <code>match</code> on the two variants. It is verbose and completely clear.</p>
${sample(`use std::num::ParseIntError;

fn double(number: &str) -> Result<i32, ParseIntError> {
    let value: i32 = number.trim().parse()?;
    Ok(value * 2)
}

fn main() {
    match double("21") {
        Ok(value) => println!("doubled: {value}"),
        Err(error) => println!("could not parse: {error}"),
    }

    match double("twenty") {
        Ok(value) => println!("doubled: {value}"),
        Err(error) => println!("could not parse: {error}"),
    }
}`, { label: "src/main.rs", out: "doubled: 42\ncould not parse: invalid digit found in string" })}
<p>The error type is named in the signature, so a caller knows exactly what can go wrong without reading the body.</p>`,
      },
      {
        title: "The question mark",
        html: `<p><code>?</code> after an expression means: if this is <code>Err</code>, return that error from the current function now. If it is <code>Ok</code>, unwrap the value and carry on.</p>
${sample(`use std::num::ParseIntError;

fn sum_all(numbers: &[&str]) -> Result<i32, ParseIntError> {
    let mut total = 0;
    for number in numbers {
        total += number.parse::<i32>()?;
    }
    Ok(total)
}

fn main() {
    println!("{:?}", sum_all(&["1", "2", "3"]));
    println!("{:?}", sum_all(&["1", "two", "3"]));
}`, { label: "src/main.rs", out: 'Ok(6)\nErr(ParseIntError { kind: InvalidDigit })' })}
<p>Without <code>?</code> that loop needs a nested <code>match</code> in every iteration. The operator exists so the happy path stays flat and readable.</p>`,
      },
      {
        title: "Your own error type",
        html: `<p>When a function can fail for more than one reason, give it an error enum. Each variant names a real failure, and the caller can match on them.</p>
${sample(`#[derive(Debug)]
enum StockError {
    UnknownPart(String),
    NotEnough { available: u32, requested: u32 },
}

fn take(stock: u32, requested: u32) -> Result<u32, StockError> {
    if requested > stock {
        return Err(StockError::NotEnough {
            available: stock,
            requested,
        });
    }
    Ok(stock - requested)
}

fn main() {
    println!("{:?}", take(40, 12));
    println!("{:?}", take(4, 12));
}`, { label: "src/main.rs", out: "Ok(28)\nErr(NotEnough { available: 4, requested: 12 })" })}
<p>Deriving <code>Debug</code> makes the failure printable. In a real project you would also implement <code>Display</code> so the message reads well for a user.</p>`,
      },
      {
        title: "panic, and when not to",
        html: `<p>A panic aborts the current thread. It is for a bug that should never happen, not for input you expect to be wrong.</p>
${sample(`fn main() {
    let numbers = [1, 2, 3];
    let index = 5;

    if let Some(value) = numbers.get(index) {
        println!("value {value}");
    } else {
        println!("no element at index {index}");
    }
}`, { label: "src/main.rs", out: "no element at index 5" })}
<p><code>.get()</code> returns an <code>Option</code> and never panics, while <code>numbers[index]</code> panics on an out-of-range index. For anything driven by user input, choose the version that returns a value.</p>
${callout("note", "Rule of thumb", `<p>Use <code>Result</code> when the caller can recover. Use <code>Option</code> when the only information is presence or absence. Use <code>panic!</code> when continuing would leave the program in a state you cannot reason about.</p>`)}`,
      },
    ]),
    exercise: {
      prompt:
        "Write <code>fn average(numbers: &amp;[i32]) -&gt; Result&lt;f64, String&gt;</code> that returns <code>Err(\"empty list\".to_string())</code> for an empty slice. Call it with <code>&amp;[2, 4, 9]</code> and with <code>&amp;[]</code>, printing both with the debug format.",
      hint:
        "Return early: <code>if numbers.is_empty() { return Err(...); }</code>. Then sum as <code>f64</code> with <code>numbers.iter().map(|n| *n as f64).sum::&lt;f64&gt;()</code> and divide by <code>numbers.len() as f64</code>.",
      tips: [
        `The two <code>println!</code> calls in <code>main</code> are done. Implement <code>average</code> so the first call returns <code>Ok(5.0)</code> and the second returns <code>Err(...)</code>.`,
        `Handle the empty slice first. <code>numbers.is_empty()</code> tells you there is nothing to average, so return <code>Err("empty list".to_string())</code> early.`,
        `For the normal case, add the numbers as <code>f64</code> and divide by the length. Convert with <code>*n as f64</code> and <code>numbers.len() as f64</code>, then wrap the mean in <code>Ok(...)</code>.`,
      ],
      requires: "fn average(numbers: &[i32]) -> Result<f64, String>",
      starter: `fn main() {
    println!("{:?}", average(&[2, 4, 9]));
    println!("{:?}", average(&[]));
}

fn average(numbers: &[i32]) -> Result<f64, String> {
    // Empty slice -> Err. Otherwise -> Ok(mean).
    Ok(0.0)
}`,
      expected: `Ok(5.0)
Err("empty list")`,
      solution: `fn main() {
    println!("{:?}", average(&[2, 4, 9]));
    println!("{:?}", average(&[]));
}

fn average(numbers: &[i32]) -> Result<f64, String> {
    if numbers.is_empty() {
        return Err("empty list".to_string());
    }
    let sum: f64 = numbers.iter().map(|n| *n as f64).sum();
    Ok(sum / numbers.len() as f64)
}`,
    },
  },

  {
    slug: "modules-and-tests",
    title: "Modules, tests, and what next",
    lede:
      "Split code into modules, prove it works with tests, and then go build something. The last lesson is mostly about the habit.",
    minutes: 16,
    group: "Real programs",
    body: () => sections([
      {
        title: "Modules are namespaces",
        html: `<p><code>mod</code> groups related items and controls what is visible outside. Everything is private by default, and <code>pub</code> opens one item at a time.</p>
${sample(`mod text {
    pub fn slugify(input: &str) -> String {
        let mut out = String::new();
        let mut pending_dash = false;

        for ch in input.chars() {
            if ch.is_alphanumeric() {
                for lower in ch.to_lowercase() {
                    out.push(lower);
                }
                pending_dash = false;
            } else if !pending_dash && !out.is_empty() {
                out.push('-');
                pending_dash = true;
            }
        }

        while out.ends_with('-') {
            out.pop();
        }
        out
    }
}

fn main() {
    println!("{}", text::slugify("Learn Rust, for beginners"));
    println!("{}", text::slugify("  --Hello--World--  "));
}`, { label: "src/main.rs", out: "learn-rust-for-beginners\nhello-world" })}
<p>The function is reachable as <code>text::slugify</code> because it is <code>pub</code>. Drop the <code>pub</code> and <code>main</code> can no longer see it.</p>`,
      },
      {
        title: "Splitting into files",
        html: `<p>When the module grows, move it to <code>src/text.rs</code> and keep the declaration in <code>main.rs</code>. The file becomes the module body.</p>
<pre class="tree"><code>src/
├── main.rs      mod text;
└── text.rs      pub fn slugify(...)</code></pre>
<p>A folder works the same way when the module has submodules: <code>src/text/mod.rs</code>, or <code>src/text.rs</code> with a <code>src/text/</code> folder beside it. Pick one and stay consistent.</p>`,
      },
      {
        title: "Tests live next to the code",
        html: `<p>A <code>#[cfg(test)]</code> module is compiled only for tests, so it costs nothing in the shipped program. <code>use super::*</code> pulls in everything from the parent module.</p>
${sample(`pub fn slugify(input: &str) -> String {
    let mut out = String::new();
    let mut pending_dash = false;

    for ch in input.chars() {
        if ch.is_alphanumeric() {
            for lower in ch.to_lowercase() {
                out.push(lower);
            }
            pending_dash = false;
        } else if !pending_dash && !out.is_empty() {
            out.push('-');
            pending_dash = true;
        }
    }

    while out.ends_with('-') {
        out.pop();
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn collapses_runs_of_punctuation() {
        assert_eq!(slugify("Learn Rust!! Fast"), "learn-rust-fast");
    }

    #[test]
    fn trims_edges() {
        assert_eq!(slugify("--Hello--"), "hello");
    }

    #[test]
    fn keeps_numbers() {
        assert_eq!(slugify("Lesson 3: Loops"), "lesson-3-loops");
    }
}

fn main() {
    println!("{}", slugify("Learn Rust, for beginners"));
}`, { label: "src/main.rs", out: "learn-rust-for-beginners" })}
<p>Run them with <code>cargo test</code>. Each test is a function that fails if an assertion fails, and the runner reports how many passed.</p>`,
      },
      {
        title: "assert, assert_eq, assert_ne",
        html: `<p>Three macros cover almost every check. The equality ones print both values when they fail, which is why they beat a bare <code>assert!(a == b)</code>.</p>
${sample(`fn main() {
    let total = 2 + 2;
    assert_eq!(total, 4);
    assert_ne!(total, 5);
    assert!(total > 0, "total should be positive");

    println!("all checks passed");
}`, { label: "src/main.rs", out: "all checks passed" })}`,
      },
      {
        title: "What to build next",
        html: `<p>Reading more lessons has diminishing returns now. Pick one of these and finish it, badly, then improve it. That loop teaches more than any tutorial.</p>
<ul>
  <li>A command line tool that reads a file and counts words, using <code>std::fs</code> and <code>std::env</code>.</li>
  <li>A to-do list stored as JSON, which means your first dependency and your first <code>serde</code> derive.</li>
  <li>A small HTTP server with <code>axum</code> or <code>actix-web</code>, returning one page and one JSON endpoint.</li>
  <li>The <a href="https://github.com/rust-lang/rustlings">rustlings</a> exercises, which are small fixes to broken programs and map well onto what you just learned.</li>
</ul>
<p>Two habits carry you through the first month. Read the compiler error before changing code, and write the test that reproduces a bug before fixing it.</p>`,
      },
      {
        title: "Where the language reference lives",
        html: `<p>Four places worth bookmarking, all free and all current:</p>
<ul>
  <li><a href="https://doc.rust-lang.org/book/">The Rust Programming Language</a>, the official book this course follows in spirit.</li>
  <li><a href="https://doc.rust-lang.org/std/">The standard library documentation</a>, where every method has a runnable example.</li>
  <li><a href="https://doc.rust-lang.org/rust-by-example/">Rust by Example</a>, for when you want to see a construct rather than read about it.</li>
  <li><a href="https://play.rust-lang.org">The Rust Playground</a>, which is the same service this site uses to run your code.</li>
</ul>
${callout("note", "The compiler is the teacher", `<p>Rust's error messages are written by people who expect you to read them. When one does not make sense, <code>rustc --explain</code> plus the error code gives you a full page on that exact mistake.</p>`)}`,
      },
    ]),
    exercise: {
      mode: "tests",
      ownTests: 3,
      prompt:
        "Implement <code>fn word_count(text: &amp;str) -&gt; usize</code> so it counts whitespace-separated words, and write three tests of your own: a normal sentence, empty input, and input with extra spaces. The checker runs your tests, then hidden ones against sentences you have not seen. It also runs your tests against a broken <code>word_count</code>: all three have to fail there, or they are not checking anything.",
      hint:
        "<code>text.split_whitespace().count()</code> does the counting in one line. An assertion is <code>assert_eq!(word_count(\"one two three\"), 3);</code>. Run the checker with the <code>todo!()</code> calls still in place once, so you see what a failing test looks like.",
      tips: [
        `First make <code>word_count</code> work: <code>text.split_whitespace()</code> gives an iterator of words, and <code>.count()</code> turns it into a number.`,
        `Replace each <code>todo!(...)</code> with one real assertion. <code>assert_eq!(word_count("one two three"), 3);</code> is the shape; do the same for <code>""</code> and for a string with extra spaces.`,
        `Your tests need to fail on a wrong implementation, so assert a specific count rather than just that the function runs. The checker runs them against a deliberately broken <code>word_count</code> to prove that.`,
      ],
      requires: "fn word_count(text: &str) -> usize\nthree #[test] functions of your own",
      starter: `fn word_count(text: &str) -> usize {
    // Count the whitespace-separated words.
    0
}

fn main() {
    println!("{}", word_count("one two three"));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_words() {
        todo!("assert the count for a normal sentence");
    }

    #[test]
    fn counts_nothing_in_empty_text() {
        todo!("assert the count for an empty string");
    }

    #[test]
    fn ignores_extra_spaces() {
        todo!("assert the count for a sentence with extra spaces");
    }
}`,
      expected: ``,
      solution: `fn word_count(text: &str) -> usize {
    text.split_whitespace().count()
}

fn main() {
    println!("{}", word_count("one two three"));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_words() {
        assert_eq!(word_count("one two three"), 3);
    }

    #[test]
    fn counts_nothing_in_empty_text() {
        assert_eq!(word_count(""), 0);
    }

    #[test]
    fn ignores_extra_spaces() {
        assert_eq!(word_count("  two   words "), 2);
    }
}`,
    },
  },
];

export const groups = ["Setup", "Basics", "Ownership", "Data", "Real programs"];

export const lessonHref = (lesson) => `lesson-${lesson.number}-${lesson.slug}.html`;

export function withNumbers() {
  return lessons.map((lesson, index) => ({
    ...lesson,
    number: String(index + 1).padStart(2, "0"),
    index,
    id: slugify(lesson.slug),
  }));
}
