#!/usr/bin/env python3
"""Local dev server for the rust·learn site.

    python3 server.py            # http://127.0.0.1:8000
    python3 server.py 8080       # a different port
    python3 server.py --open     # also open the browser

The site is plain HTML, CSS, and JS, so the only job here is to hand those
files to a browser over http. It matters that it is http and not file://
because the Run buttons call the Rust Playground with fetch() and progress is
stored in localStorage; browsers block both on file:// URLs.

This is a development server. It binds to localhost, disables caching so
edits show up on reload, and is not intended to face the internet. The public
copy of the site is served by GitHub Pages.
"""

import argparse
import errno
import sys
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # A dev server that caches is a dev server you stop trusting.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Keep the output to one short line per request instead of two.
        sys.stderr.write("  %s\n" % (fmt % args))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Serve the rust·learn site on localhost.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Example: python3 server.py 8080 --open",
    )
    parser.add_argument("port", nargs="?", type=int, default=8000, help="port to listen on (default: 8000)")
    parser.add_argument("--host", default="127.0.0.1", help="address to bind (default: 127.0.0.1)")
    parser.add_argument("--open", action="store_true", help="open the site in your browser")
    args = parser.parse_args()

    if not (ROOT / "index.html").exists():
        print("index.html is missing. Build the site first:", file=sys.stderr)
        print("  node build.mjs", file=sys.stderr)
        return 1

    handler = partial(Handler, directory=str(ROOT))

    try:
        server = ThreadingHTTPServer((args.host, args.port), handler)
    except OSError as error:
        if error.errno == errno.EADDRINUSE:
            print(f"Port {args.port} is already in use.", file=sys.stderr)
            print(f"Try another one:  python3 server.py {args.port + 1}", file=sys.stderr)
            return 1
        raise

    url = f"http://{args.host}:{args.port}/"
    print(f"rust·learn running at {url}")
    print("Press ctrl+c to stop.\n")

    if args.open:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
