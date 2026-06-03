---
name: run-capacitacion
description: Build, run, and screenshot the capacitacion.cruza.pet static landing page. Use when asked to run capacitacion, serve it locally, render/screenshot the page, or verify the HTML looks right before deploy.
---

`capacitacion` is a single static `index.html` (the `capacitacion.cruza.pet`
landing). In production nginx serves the file directly — there is no build
step and no app server. An agent drives it by serving the file over HTTP and
rendering it in headless Chromium via the committed driver
`.claude/skills/run-capacitacion/driver.mjs` (Playwright), which screenshots
the page and asserts its key content.

All paths below are relative to the repo root (`capacitacion/`).

## Prerequisites

Node 18+ (tested on Node 24) and Python 3 (for the static server). No
`apt-get` packages were needed — Playwright's bundled Chromium ran headless
in this container as-is.

## Setup

One-time, from the repo root — installs the driver's deps and downloads the
Chromium that Playwright drives:

```bash
npm --prefix .claude/skills/run-capacitacion install
.claude/skills/run-capacitacion/node_modules/.bin/playwright install chromium
```

## Run (agent path)

Serve the page, drive it with the headless-Chromium driver, then stop the
server. The driver renders the page, writes a screenshot, dumps any console
errors, and exits non-zero if the page didn't render correctly.

```bash
# 1) serve the static file in the background, wait until it answers
python3 -m http.server 8000 >/tmp/capacitacion-httpd.log 2>&1 & echo $! > /tmp/capacitacion-httpd.pid
timeout 15 bash -c 'until curl -sf http://localhost:8000/ >/dev/null; do sleep 0.3; done'

# 2) render + screenshot + assert (exit 0 = PASS)
node .claude/skills/run-capacitacion/driver.mjs http://localhost:8000

# 3) stop the server
kill "$(cat /tmp/capacitacion-httpd.pid)"
```

Screenshot lands at `/tmp/shots/capacitacion.png` (override with
`SHOTS_DIR=/path`). The driver prints a JSON report and asserts: title
contains "Capacitación", `<h1>` contains "líderes", `<html lang>` is `es-CL`,
the "En preparación" badge is present, and there are no real console errors
(Google-Fonts network noise is ignored). Expected tail:

```
  "status": "PASS"
```

No server needed at all — the driver also accepts a `file://` URL:

```bash
node .claude/skills/run-capacitacion/driver.mjs "file://$PWD/index.html"
```

## Run (human path)

```bash
python3 -m http.server 8000   # → open http://localhost:8000 in a browser, Ctrl-C to stop
```

Useless headless (no window); use the agent path above to actually see the page.

## Deploy

Not part of "run". The live site auto-deploys: any push to `main` triggers
GitHub Actions → SSH → the VPS pulls and reloads nginx. For a manual deploy,
`./deploy.sh` (needs a local `deploy.env`; see [README.md](../../../README.md)).

## Gotchas

- **`sudo` is not passwordless in this container**, so `playwright install-deps`
  (the apt step) can't run. It wasn't needed — Chromium launched fine without
  extra system libs. If a different host is missing libs, Chromium will fail to
  launch and you'd need a root shell for `npx playwright install-deps chromium`.
- **Chromium needs `--no-sandbox`** here (already set in `driver.mjs`). Without
  it, headless Chromium fails to start as a sandboxed non-root process.
- **Google Fonts is the only external request.** The driver waits for `load`,
  not `networkidle`, so it won't hang if fonts are blocked offline; font-load
  console errors are filtered out of the pass/fail check on purpose.
- **`node_modules/` under the skill dir is gitignored** — re-run the Setup
  commands after a fresh clone; only `driver.mjs` + `package.json` are committed.

## Troubleshooting

- **`curl: connection refused` / driver can't reach localhost:8000**: the
  `http.server` isn't up yet or the port is taken. The `timeout … until curl`
  poll handles startup; for a stale server `kill "$(cat /tmp/capacitacion-httpd.pid)"`
  or `pkill -f 'http.server 8000'` before re-running.
- **`Executable doesn't exist at …/chromium-XXXX`**: the Chromium download step
  was skipped. Re-run `.claude/skills/run-capacitacion/node_modules/.bin/playwright install chromium`.
