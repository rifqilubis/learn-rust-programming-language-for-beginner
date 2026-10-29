/**
 * Locate the Rust toolchain the way the platform actually stores it.
 *
 * `home` is not `HOME`: Windows has no `$HOME` by default, so resolving
 * `$HOME/.cargo/bin/rustc` produced a relative path and both verifiers
 * reported "rustc not found" even with a working toolchain installed.
 *
 * Order: CARGO_HOME, then the platform home directory, then PATH.
 */

import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const EXE = process.platform === "win32" ? ".exe" : "";

function usable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** An absolute path to `rustc`, or the bare name so PATH can answer. */
export function findRustc() {
  const candidates = [];
  if (process.env.CARGO_HOME) candidates.push(join(process.env.CARGO_HOME, "bin", `rustc${EXE}`));
  candidates.push(join(homedir(), ".cargo", "bin", `rustc${EXE}`));
  for (const candidate of candidates) {
    if (usable(candidate)) return candidate;
  }
  /* Fall back to PATH; spawnSync reports a clear error if it is missing too. */
  return `rustc${EXE}`;
}
