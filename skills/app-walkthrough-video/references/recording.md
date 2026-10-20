# Recording

## How it works

`template/rec/harness.mjs` launches the app with a remote-debugging port, attaches Playwright over
CDP, and records with `recorder.mjs`: a CDP screencast (frames arrive when pixels change, each is held
until the next, ffmpeg rebuilds constant 30 fps at 1920×1080) plus an `events.json` on the same clock.
The edit reads those events: `shot` marks find each beat's footage, `click`/`focus` boxes become
zooms + spotlight + cursor, `speed` spans are fast-forwarded with a badge.

## project.json "app"

```json
"app": {"kind": "electron", "path": "/Applications/MyApp.app", "window": [1440, 810],
        "cdp_port": 9433, "inspect_port": 9434,
        "home": "/Users/Shared/demo/home", "profile": "/tmp/demo/profile",
        "page_match": "app://", "on_connect": "await window.api.zoom.set(1)",
        "path_env": "/opt/homebrew/bin:/usr/bin:/bin", "env": {}, "args": [], "boot_ms": 5000}
```
- `kind: "web"`: give `url` instead of `path`; Chrome is launched in app mode on that URL
  (`chrome` path optional). `page_match` defaults to the URL.
- `window` 1440×810 records crisp at 1920×1080 (16:9) and keeps UI text readable.
- Pick ports nobody else uses (a running Chrome often has 9222/9333).

## Demo environment (do this before the first take)

- **Demo HOME** (`app.home`): a separate home folder with sample projects (small, realistic, a known
  bug to fix on camera works well), git remotes (a local bare repo for push), and the CLI logins the app
  needs. For credential files that refresh themselves (OAuth tokens), **symlink** the user's real file
  instead of copying it — two copies rotate each other's refresh token and log the user out.
- **Fresh profile** (`app.profile`): `rec.sh <p> launch` wipes it. A reset script that puts the sample
  projects back to their first commit makes takes repeatable.
- The app is launched with a clean environment (no shell secrets). Inside AI-agent shells
  `ELECTRON_RUN_AS_NODE` is often set and makes Electron exit immediately; rec.sh unsets it.
- On macOS `.app` paths are launched with `open -n` so the app survives the script; window
  fullscreen/maximize is locked so the recorded size never changes.

## Writing scenes (`rec/scenes.mjs`)

```js
const { Scene, runScenes, main, stubPicker, P } = await import(process.env.WALK_HARNESS);
await runScenes({
  async c05(page) {
    const s = new Scene(page, 'c05'); await s.start();
    s.shot('agents-send');                                   // a beat in beats.json uses this id
    await s.click(page.getByRole('button', { name: 'Model', exact: true }), 'Model');
    await s.type('Fix the failing test in src/forecast.js');
    await s.key('Enter', 1500);
    s.shot('agents-live');
    await s.box(page.locator('.thread-thinking'), 'Working for');   // zoom/spotlight without a click
    s.speedFrom(); await waitReplyDone(page); s.speedTo();         // fast-forward the wait
    await s.stop();
  },
});
```
- One scene = one continuous take covering several shots. Keep 1–3 s of calm after each action.
- Use visible-only locators (`.filter({ visible: true })`): apps often keep hidden copies of panels.
- Optional UI: guard with `isVisible().catch(() => false)` so a missing element never kills a take.
- Native dialogs (Electron): `stubPicker(path)` makes open-file/folder dialogs return `path`.
- Main-process tricks (Electron): `main("electron.clipboard.writeImage(...)")`.
- A scene can quit and relaunch the app and continue in a second Scene (`edit.continue` joins them).
- On a crash the partial take is saved; fix and re-run only that scene.

Commands: `rec.sh <p> poke 'return await page.locator("button").allInnerTexts()'` while writing;
`rec.sh <p> scenes c04,c05 --launch` (fresh) or without `--launch` (attach to running app);
`rec.sh <p> sheet` → `build/qc/takes.jpg`.

## Website tour

`rec.sh <p> site` records `site-tour` (smooth scroll, a `label` mark per stop), and optionally
`site-lang` (language switcher clicks) and `site-mobile` (phone viewport, menu tap). Run it once without
`stops` to print the page's section ids. If local DNS blocks the host, set `site.host_map`
(`"MAP example.com 1.2.3.4"`).

## Privacy checklist per take

Look at `build/qc/end_*.png` and scrub through each clip: account names, emails, tokens, API keys,
home-folder paths with a real user name, LAN IPs, QR codes, other people's data, notifications.
Fix by changing the demo data, `redact` / `redact_css`, cropping in the edit, or re-recording.
