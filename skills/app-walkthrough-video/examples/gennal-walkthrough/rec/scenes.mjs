// GenNal walkthrough scenes (worked example). Run: scripts/rec.sh <project> scenes c04,c05 [--launch]
// Each scene is one continuous take. Inside it, s.shot('<id>') starts a shot that beats.json refers to;
// s.click / s.box mark zoom + cursor targets; s.speedFrom() / s.speedTo() wrap waits to fast-forward.
const { connect, Scene, main, stubPicker, launch, sleep, runScenes, P } = await import(process.env.WALK_HARNESS);
const H = `${P.app.home}/projects`;   // sample projects live in the demo HOME

async function newTerminal(s, page, tag, label) {
  await s.click(page.getByRole('button', { name: /New terminal/ }).filter({ visible: true }).first(), '+ New terminal', { post: 700 });
  await s.click(page.getByRole('menuitem').filter({ hasText: tag }).filter({ visible: true }).first(), label || tag, { post: 900 });
}
const pane = (page, title) =>
  page.locator('.pane').filter({ has: page.locator('.pane-name', { hasText: new RegExp(`^\\s*${title}\\s*$`) }) }).filter({ visible: true }).first();
const paneXterm = (page, title) => pane(page, title).locator('.xterm').filter({ visible: true }).first();

async function typeInPane(s, page, title, text) {
  const x = paneXterm(page, title);
  await s.click(x, '', { pre: 300, post: 300 });
  await s.type(text, { delay: 45 });
}

// Wait until no chat reply is streaming (status line gone and send button not "Stop").
async function waitReplyDone(page, maxMs = 420000) {
  const t0 = Date.now();
  await page.waitForTimeout(2500);
  while (Date.now() - t0 < maxMs) {
    const busy = await page.evaluate(() => !!document.querySelector('.thread-worked.is-live, .thread-thinking'));
    if (!busy) return true;
    await page.waitForTimeout(1500);
  }
  return false;
}


async function cleanAgents(page) {
  const pill = page.locator('.ide-agents-pill');
  if (await pill.isVisible().catch(() => false)) { await pill.click(); await page.waitForTimeout(1500); }
  for (let i = 0; i < 6; i++) {
    const c = page.locator('button.tasks-icon-btn[title^="Close"]:visible').first();
    if (!(await c.isVisible().catch(() => false))) break;
    await c.click(); await page.waitForTimeout(600);
  }
  await page.keyboard.press('Escape');
}
async function toIde(page) {
  const b = page.getByRole('button', { name: 'Open the IDE' });
  if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(1500); }
}

const scenes = {
  // Chapter 4: first launch, open project, live model panes, sign-in prompt, add a model
  async c04(page) {
    const s = new Scene(page, 'c04'); await s.start();
    s.shot('app-first-launch');
    await s.wait(3000);
    await s.click(page.getByRole('button', { name: /Claude Opus|Model/ }).filter({ visible: true }).first(), 'Model picker', { post: 3500 });
    await s.key('Escape', 2500);
    s.shot('app-open-project');
    await s.click(page.getByText('Choose project', { exact: true }), 'Choose project');
    await s.click(page.getByText('Add a project', { exact: true }), 'Add a project');
    await s.click(page.getByText('Browse folder', { exact: true }), 'Browse folder', { post: 3000 });
    s.shot('app-launch-panes');
    await newTerminal(s, page, 'claude-code', 'Claude');
    await s.wait(6000);
    await typeInPane(s, page, 'Claude', 'In one sentence, what does this project do?');
    await s.key('Enter', 500);
    await newTerminal(s, page, 'codex-cli', 'Codex');
    await s.wait(6000);
    if (await pane(page, 'Codex').getByText(/Trust this folder|Folder access/).count()) {
      await s.click(paneXterm(page, 'Codex'), 'Trust and continue', { pre: 200, post: 200 });
      await s.key('Enter', 3500);
    }
    await newTerminal(s, page, 'zsh', 'Shell');
    await s.wait(2500);
    await typeInPane(s, page, 'zsh', 'npm test');
    await s.key('Enter', 6000);
    s.shot('app-gemini-signin');
    await newTerminal(s, page, 'gemini-cli', 'Gemini');
    await s.wait(8000);
    await s.click(paneXterm(page, 'Gemini'), '', { pre: 200, post: 300 });
    await s.key('Enter', 7000);
    const gem = pane(page, 'Gemini').getByRole('button', { name: 'Close terminal' }).filter({ visible: true }).first();
    await s.click(gem, 'Close terminal', { post: 900 });
    await s.click(page.getByRole('button', { name: 'Close', exact: true }).last(), 'Close', { post: 1500 });
    s.shot('app-add-model');
    await s.click(page.getByRole('button', { name: /New terminal/ }).filter({ visible: true }).first(), '+ New terminal', { post: 700 });
    await s.click(page.getByRole('menuitem').filter({ hasText: 'Add model' }).filter({ visible: true }).first(), 'Add model', { post: 1000 });
    await s.click(page.locator('input[placeholder="e.g. Ollama"]:visible'), 'Name', { post: 200 });
    await s.type('Claude Haiku');
    await s.click(page.locator('input[placeholder="e.g. ollama run llama3"]:visible'), 'Run command', { post: 200 });
    await s.type('claude --model haiku');
    const sw = page.locator('.addmodel-accent');
    if (await sw.count()) await s.click(sw.nth(Math.min(3, (await sw.count()) - 1)), 'Accent', { post: 600 });
    await s.click(page.getByRole('button', { name: 'Add model', exact: true }).last(), 'Add model', { post: 1200 });
    await s.click(page.getByRole('button', { name: /New terminal/ }).filter({ visible: true }).first(), '+ New terminal', { post: 900 });
    await s.click(page.getByRole('menuitem').filter({ hasText: 'Claude Haiku' }).filter({ visible: true }).first(), 'Claude Haiku', { post: 9000 });
    await s.stop();
  },
  // Chapter 5: Agents Window
  async c05(page) {
    const s = new Scene(page, 'c05'); await s.start();
    s.shot('agents-overview');
    await s.wait(1500);
    await s.box(page.locator('.sidebar').filter({ visible: true }).first(), 'Projects & threads');
    await s.wait(2500);
    await s.box(page.locator('.pane').filter({ visible: true }).first(), 'Model panes');
    await s.wait(2500);
    await s.box(page.getByText('Output', { exact: true }).filter({ visible: true }).first(), 'Output & terminal');
    await s.wait(2500);
    await s.box(page.locator('section[aria-label="Usage"], .sidebar-usage, [class*=usage]').filter({ visible: true }).first(), 'Usage');
    await s.wait(2500);
    await page.getByRole('button', { name: 'Hide code panel' }).click().catch(() => {});
    await s.wait(800);
    s.shot('agents-new-thread');
    await s.click(page.getByText('New thread', { exact: true }).filter({ visible: true }).first(), 'New thread', { post: 1500 });
    await s.click(page.locator('.cmp-input').filter({ visible: true }).first(), 'Composer', { post: 400 });
    s.shot('agents-send');
    await page.keyboard.press('Escape');
    await s.click(page.getByRole('button', { name: 'Model', exact: true }), 'Model', { post: 1200 });
    await s.click(page.getByRole('button', { name: 'Codex', exact: true }), 'Codex', { post: 1000 });
    await s.click(page.getByText('GPT-6-Luna', { exact: true }).filter({ visible: true }).first(), 'GPT-6-Luna', { post: 1000 });
    await s.click(page.getByRole('button', { name: 'Reasoning effort' }).filter({ visible: true }).first(), 'Reasoning effort', { post: 1800 });
    await s.key('Escape', 500);
    await s.click(page.getByRole('button', { name: 'Access mode' }).filter({ visible: true }).first(), 'Access mode', { post: 1800 });
    await s.key('Escape', 500);
    await s.click(page.locator('.cmp-input').filter({ visible: true }).first(), 'Composer', { post: 300 });
    await s.type('The Fahrenheit test fails. Fix the bug in src/forecast.js, then add a humidity field to every city and show it on the page.', { delay: 30 });
    await s.key('Enter', 1500);
    s.shot('agents-live');
    await s.wait(3000);
    await s.box(page.locator('.thread-worked.is-live, .thread-thinking').filter({ visible: true }).first(), 'Working for');
    await s.wait(7000);
    s.shot('agents-queue');
    await s.click(page.locator('.cmp-input').filter({ visible: true }).first(), 'Composer', { post: 300 });
    await s.type('Also add a test for Kampot', { delay: 40 });
    await s.click(page.locator('button.cmp-send').filter({ visible: true }).first(), 'Queue message', { post: 1200 });
    await s.box(page.locator('.thread-queued').filter({ visible: true }).first(), 'Queued');
    await s.wait(5000);
    s.speedFrom();
    await waitReplyDone(page);
    await page.waitForTimeout(4000);
    await waitReplyDone(page);
    s.speedTo();
    s.shot('agents-worked');
    const worked = page.locator('.thread-worked.is-toggle').filter({ visible: true }).first();
    await s.click(worked, 'Worked for', { post: 2500 });
    await s.click(worked, 'Worked for', { post: 1500 });
    s.shot('agents-diff');
    const open = page.locator('.tturn-btn', { hasText: 'Open diff' }).filter({ visible: true }).first();
    await open.scrollIntoViewIfNeeded();
    await s.box(page.locator('.tturn-title').filter({ visible: true }).first(), 'Changed files');
    await s.wait(2500);
    await s.click(open, 'Open diff', { post: 2500 });
    await s.click(page.getByRole('button', { name: 'Split' }).or(page.locator('button[title="Split"]')).filter({ visible: true }).first(), 'Split', { post: 2500 });
    await s.click(page.locator('.tdiff-turn-btn').filter({ visible: true }).first(), 'Turn picker', { post: 1300 });
    await s.click(page.locator('.tdiff-menu-item', { hasText: /^Turn 2/ }).filter({ visible: true }).first(), 'Turn 2', { post: 2200 });
    await s.click(page.locator('.tdiff-turn-btn').filter({ visible: true }).first(), 'Turn picker', { post: 1000 });
    await s.click(page.locator('.tdiff-menu-item', { hasText: 'All turns' }).filter({ visible: true }).first(), 'All turns', { post: 1800 });
    await s.click(page.getByRole('button', { name: 'Unified' }).or(page.locator('button[title="Unified"]')).filter({ visible: true }).first(), 'Unified', { post: 1800 });
    await s.click(page.getByRole('button', { name: 'Close diff' }).filter({ visible: true }).first(), 'Close diff', { post: 1000 });
    s.shot('agents-paste-image');
    await s.click(page.locator('button[title^="New thread"]').filter({ visible: true }).first(), 'New thread', { post: 1500 });
    await main(`electron.clipboard.writeImage(electron.nativeImage.createFromPath(${JSON.stringify(P.app.home + '/../design.png')})); return 1`);
    await s.click(page.locator('.cmp-input').filter({ visible: true }).first(), 'Composer', { post: 300 });
    await s.type('Make the card look like ', { delay: 40 });
    await s.key('Meta+v', 1200);
    await s.type(' but keep our dark colors.', { delay: 40 });
    await s.box(page.locator('.cmp-inline-chip').filter({ visible: true }).first(), 'Image chip');
    await s.wait(2500);
    await s.key('Enter', 2500);
    s.speedFrom();
    await waitReplyDone(page);
    s.speedTo();
    s.shot('agents-image-menu');
    const img = page.locator('.thread-msg img, [class*=msg] img, .thread img').last();
    await img.scrollIntoViewIfNeeded();
    const b = await img.boundingBox();
    await s.box(img, 'Right-click image', 'click');
    await s.wait(1500);
    await main(`const w = BrowserWindow.getAllWindows().find(x => x.isVisible()); w.webContents.copyImageAt(${Math.round(b.x + b.width / 2)}, ${Math.round(b.y + b.height / 2)}); return 1`);
    await s.wait(1200);
    await s.click(page.locator('.cmp-input').filter({ visible: true }).first(), 'Composer', { post: 300 });
    await s.key('Meta+v', 2500);
    await s.box(page.locator('.cmp-inline-chip').filter({ visible: true }).first(), 'Copied image');
    await s.wait(2500);
    await page.keyboard.press('Meta+a'); await page.keyboard.press('Backspace');
    await s.wait(800);
    s.shot('agents-grid');
    await s.click(page.locator('.thread-tab, [class*=tab]').filter({ hasText: /^\s*\d*\s*Claude\s*$/ }).filter({ visible: true }).first(), 'Claude pane', { post: 1800 });
    const p0 = page.locator('.pane').filter({ visible: true }).first();
    await s.click(p0.getByRole('button', { name: 'Split terminal' }), 'Split terminal', { post: 1000 });
    await s.click(page.getByRole('button', { name: /to the right/ }).or(page.locator('.psp-right')).filter({ visible: true }).first(), 'Add terminal to the right', { post: 2500 });
    await s.click(p0.getByRole('button', { name: 'Maximize terminal' }), 'Maximize', { post: 2500 });
    await s.click(page.getByRole('button', { name: 'Restore grid layout' }).filter({ visible: true }).first(), 'Restore grid', { post: 2000 });
    await s.click(page.locator('.pane').last().getByRole('button', { name: 'Close terminal' }), 'Close terminal', { post: 900 });
    const cf = page.getByRole('button', { name: 'Close', exact: true }).last();
    if (await cf.isVisible().catch(() => false)) await s.click(cf, 'Close', { post: 1500 });
    await s.stop();
  },

  async c05b(page) {
    const s = new Scene(page, 'c05b'); await s.start();
    s.shot('agents-workspaces');
    await stubPicker(`${H}/landing-page`);
    await s.click(page.getByRole('button', { name: 'Add project' }).filter({ visible: true }).first(), 'Add project', { post: 1000 });
    await s.click(page.getByText('Browse folder', { exact: true }), 'Browse folder', { post: 2500 });
    await stubPicker(`${H}/weather-app`);
    await s.click(page.getByRole('button', { name: /^Choose project/ }).filter({ visible: true }).first(), 'Choose project', { post: 1000 });
    await s.click(page.getByText('All projects', { exact: true }).filter({ visible: true }).first(), 'All projects', { post: 1800 });
    const ws = page.locator('.sidebar').getByText('weather-app', { exact: true }).filter({ visible: true }).first();
    await s.click(ws, 'weather-app workspace', { post: 1800 });
    await s.click(ws, 'weather-app workspace', { post: 1800 });
    await s.box(page.getByRole('button', { name: /New terminal in/ }).filter({ visible: true }).first(), 'New terminal');
    await s.wait(1800);
    await s.box(page.getByRole('button', { name: /New chat in/ }).filter({ visible: true }).first(), 'New chat');
    await s.wait(1800);
    s.shot('agents-to-editor');
    await s.click(page.getByRole('button', { name: 'Open the IDE' }), 'IDE', { post: 3000 });
    await s.stop();
  },
  // Chapter 6: Sessions (part 1, before the restart)
  async c06(page) {
    const pill = page.locator('.ide-agents-pill');
    if (await pill.isVisible().catch(() => false)) { await pill.click(); await page.waitForTimeout(1500); }
    const s = new Scene(page, 'c06'); await s.start();
    s.shot('sessions-view');
    await s.click(page.getByRole('button', { name: 'Search threads' }), 'Search threads', { post: 2500 });
    for (const t of ['Chat', 'Terminal', 'Apps', 'All']) await s.click(page.getByRole('tab', { name: new RegExp('^' + t) }).filter({ visible: true }).first(), t, { post: 1500 });
    s.shot('sessions-filter');
    await s.click(page.getByRole('button', { name: 'Claude', exact: true }).filter({ visible: true }).first(), 'Claude', { post: 1500 });
    await s.click(page.getByRole('button', { name: 'This project' }).filter({ visible: true }).first(), 'This project', { post: 1500 });
    await s.click(page.getByRole('button', { name: 'All agents' }).filter({ visible: true }).first(), 'All agents', { post: 800 });
    await page.getByPlaceholder('Search sessions').fill('');
    await s.click(page.getByPlaceholder('Search sessions'), 'Search sessions', { post: 200 });
    await s.type('favourite city', { delay: 60 });
    await s.wait(1800);
    s.shot('sessions-continue');
    await s.click(page.getByRole('tab', { name: /^Terminal/ }).filter({ visible: true }).first(), 'Terminal', { post: 1500 });
    const row = page.locator('.sx-row').filter({ hasText: 'favourite city' }).filter({ visible: true }).first();
    await row.hover(); await s.wait(800);
    await s.click(row.getByRole('button', { name: /^Continue/ }).filter({ visible: true }).first(), 'Continue', { post: 5000 });
    await s.click(page.locator('.cmp-input').filter({ visible: true }).first(), 'Composer', { post: 200 });
    await s.type('What is my favourite city?', { delay: 40 });
    await s.key('Enter', 2000);
    s.speedFrom();
    await waitReplyDone(page);
    s.speedTo();
    await s.wait(3000);
    s.shot('sessions-restart');
    await s.click(page.locator('.cmp-input').filter({ visible: true }).first(), 'Composer', { post: 200 });
    await s.type('Walk me through server.js section by section, in detail.', { delay: 35 });
    await s.key('Enter', 6000);
    await s.click(page.locator('.cmp-input').filter({ visible: true }).first(), 'Composer', { post: 200 });
    await s.type('my unsent draft', { delay: 60 });
    await s.wait(1500);
    s.label('Quit GenNal');
    await s.wait(1200);
    await s.stop();
    await main(`setTimeout(() => app.quit(), 200); return 1`);
    await sleep(4000);
    await launch();
    const c = await connect();
    await stubPicker(`${H}/weather-app`);
    const s2 = new Scene(c.page, 'c06b'); await s2.start();
    s2.shot('sessions-restart-2');
    await s2.wait(3000);
    await s2.box(c.page.locator('.thread-retry').filter({ visible: true }).first(), 'Stopped when GenNal closed');
    await s2.wait(2500);
    await s2.box(c.page.locator('.cmp-input').filter({ visible: true }).first(), 'Draft restored');
    await s2.wait(2500);
    await s2.click(c.page.locator('.thread-retry').filter({ visible: true }).first(), 'Continue', { post: 8000 });
    await s2.stop();
    return c.page;
  },

  // Chapter 7: Editor Window
  async c07(page) {
    const pill = page.locator('.ide-agents-pill');
    if (await pill.isVisible().catch(() => false)) { await pill.click(); await page.waitForTimeout(1500); }
    const s = new Scene(page, 'c07'); await s.start();
    s.shot('editor-overview');
    await s.click(page.getByRole('button', { name: 'Open the IDE' }), 'IDE', { post: 2000 });
    await s.click(page.getByRole('button', { name: 'Explorer', exact: true }), 'Explorer', { post: 800 }).catch(() => {});
    await s.click(page.locator('.ide-tree, [class*=explorer]').getByText('src', { exact: true }).filter({ visible: true }).first(), 'src', { post: 800 });
    await s.click(page.getByText('forecast.js', { exact: true }).filter({ visible: true }).first(), 'forecast.js', { post: 2500 });
    s.shot('editor-dock');
    if (!(await page.locator('aside[aria-label="Agent chat"]').isVisible().catch(() => false)))
      await s.click(page.getByRole('button', { name: 'Agent chat', exact: true }).filter({ visible: true }).first(), 'Agent chat', { post: 1500 });
    await page.getByRole('button', { name: 'Start a new chat' }).filter({ visible: true }).first().click().catch(() => {});
    await s.wait(800);
    await s.click(page.getByRole('button', { name: 'Explain file', exact: true }).filter({ visible: true }).first(), 'Explain file', { post: 2000 });
    s.speedFrom();
    await waitReplyDone(page, 240000); await page.waitForTimeout(3000);
    s.speedTo();
    await s.wait(2500);
    s.shot('editor-palette');
    await s.key('Meta+k', 900);
    await s.type('Launch', { delay: 70 }); await s.wait(1600);
    await page.keyboard.press('Meta+a'); await s.type('Layout', { delay: 70 }); await s.wait(1600);
    await page.keyboard.press('Meta+a'); await s.type('server', { delay: 70 }); await s.wait(1200);
    await s.key('Enter', 1800);
    await s.stop();
  },

  async c07b(page) {
    await toIde(page);
    const s = new Scene(page, 'c07b'); await s.start();
    s.shot('editor-search');
    if (!(await page.getByRole('button', { name: 'Match Case' }).filter({ visible: true }).first().isVisible().catch(() => false)))
      await s.click(page.getByRole('button', { name: 'Search', exact: true }).filter({ visible: true }).first(), 'Search', { post: 900 });
    const q = page.locator('input[placeholder="Search"]:visible, textarea[placeholder="Search"]:visible').last();
    await q.fill('').catch(() => {});
    await s.click(q, 'Search', { post: 200 });
    await s.type('Unknown', { delay: 70 }); await s.wait(1200);
    await s.click(page.getByRole('button', { name: 'Match Case' }).filter({ visible: true }).first(), 'Match Case', { post: 900 });
    await s.click(page.getByRole('button', { name: 'Use Regular Expression' }).filter({ visible: true }).first(), 'Regex', { post: 900 });
    await s.click(page.getByRole('button', { name: 'Use Regular Expression' }).filter({ visible: true }).first(), 'Regex', { post: 600 });
    if (!(await page.locator('input[placeholder="src/**/*.ts"]:visible').filter({ visible: true }).first().isVisible().catch(() => false)))
      await s.click(page.getByRole('button', { name: /search details/ }).filter({ visible: true }).first(), 'Include / exclude', { post: 900 });
    await page.locator('input[placeholder="src/**/*.ts"]:visible').first().fill('');
    await s.click(page.locator('input[placeholder="src/**/*.ts"]:visible').filter({ visible: true }).first(), 'files to include', { post: 200 });
    await s.type('src/**', { delay: 60 }); await s.key('Enter', 1500);
    if (!(await page.locator('input[placeholder="Replace"]:visible').count()))
      await s.click(page.locator('button.ce-search-toggle-replace:visible').first(), 'Replace', { post: 800 });
    await page.locator('input[placeholder="Replace"]:visible').first().fill('');
    await s.click(page.locator('input[placeholder="Replace"]:visible').first(), 'Replace', { post: 200 });
    await s.type('No data', { delay: 60 }); await s.wait(1200);
    await s.click(page.getByRole('button', { name: 'Replace all' }).filter({ visible: true }).first(), 'Replace all', { post: 1500 });
    const confirm = page.getByRole('button', { name: /^Replace/ }).last();
    if (await page.locator('[role=dialog], .confirm-popover').count()) await s.click(confirm, 'Replace', { post: 1500 });
    await s.wait(1500);
    s.shot('editor-terminal');
    await s.key('Control+Backquote', 1500);
    await s.type('npm test', { delay: 60 }); await s.key('Enter', 5000);
    await s.click(page.getByRole('button', { name: 'Explorer', exact: true }), 'Explorer', { post: 800 });
    await s.click(page.getByText('server.js', { exact: true }).filter({ visible: true }).first(), 'server.js', { post: 1500 });
    const stop = page.getByRole('button', { name: /^Stop/ }).filter({ visible: true }).first();
    if (await stop.isVisible().catch(() => false)) { await stop.click(); await page.waitForTimeout(1500); }
    await s.click(page.getByRole('button', { name: 'Run the open file' }), 'Run', { post: 5000 });
    await s.stop();
  },

  // Chapter 8: Ship your work
  async c08(page) {
    await cleanAgents(page);
    const s = new Scene(page, 'c08'); await s.start();
    s.shot('ship-intro');
    await s.click(page.locator('button[title^="New thread"]').filter({ visible: true }).first(), 'New thread', { post: 2500 });
    s.shot('ship-prompt');
    await s.click(page.locator('.cmp-input').filter({ visible: true }).first(), 'Composer', { post: 200 });
    await s.type('add a 5 day forecast page', { delay: 50 });
    await s.click(page.locator('#ai-prompt-generator, [data-feature="ai-prompt-generator"]').filter({ visible: true }).first(), 'ai-prompt-generator', { post: 2000 });
    s.speedFrom();
    await waitReplyDone(page, 240000);
    s.speedTo();
    await s.wait(4000);
    s.shot('ship-commit');
    await s.click(page.getByRole('button', { name: 'Environment' }), 'Environment', { post: 1200 });
    await s.click(page.getByRole('button', { name: /^Commit & push/ }).filter({ visible: true }).first(), 'Commit & push', { post: 1200 });
    await s.box(page.locator('select[aria-label="Commit message model"]'), 'Write with');
    await s.wait(1500);
    await s.click(page.getByRole('button', { name: 'Generate commit message' }), 'Generate commit message', { post: 1500 });
    await page.waitForFunction(() => { const i = document.querySelector('[aria-label="Commit message"]'); return i && i.value && i.value.length > 8; }, null, { timeout: 120000 }).catch(() => {});
    await s.wait(2000);
    await s.box(page.locator('[aria-label="Commit message"]'), 'Review the message');
    await s.wait(2500);
    await s.click(page.getByRole('button', { name: /^Commit & push$/ }).last(), 'Commit & push', { post: 6000 });
    await s.stop();
  },

  async c08b(page) {
    await cleanAgents(page);
    const s = new Scene(page, 'c08b'); await s.start();
    s.shot('ship-board');
    await s.click(page.getByRole('button', { name: 'Open the IDE' }), 'IDE', { post: 1500 });
    await s.click(page.locator('button.ce-rail-ext[aria-label="Workspace Board"]:visible').first(), 'Workspace Board', { post: 1800 });
    { const ob = page.getByRole('button', { name: 'Workspace Board: Open' }).filter({ visible: true }).first();
      if (await ob.isVisible().catch(() => false)) await s.click(ob, 'Workspace Board: Open', { post: 2000 }); }
    await s.click(page.getByText('Add a card', { exact: true }).filter({ visible: true }).first(), 'Add a card', { post: 600 });
    await s.click(page.getByPlaceholder(/What needs doing/).filter({ visible: true }).first(), 'What needs doing?', { post: 200 });
    await s.type('Add a 5-day forecast page', { delay: 50 });
    await s.key('Enter', 1500);
    const card = page.locator('.board-card').filter({ hasText: '5-day forecast' }).last();
    await card.hover(); await s.wait(700);
    await s.click(card.locator('.board-card-session').first(), 'Launch', { post: 900 });
    await s.click(page.locator('.board-launch-item', { hasText: /^\s*Claude\s*$/ }).first(), 'Claude', { post: 7000 });
    await s.stop();
  },

  async c08c(page) {
    await toIde(page);
    const s = new Scene(page, 'c08c'); await s.start();
    s.shot('ship-automation');
    await s.click(page.locator('.ide-agents-pill').filter({ visible: true }).first(), 'Agents Window', { post: 1200 });
    await cleanAgents(page);
    await s.key('Meta+k', 800); await s.type('Open Automations', { delay: 50 }); await s.key('Enter', 2000);
    await s.click(page.getByText('Daily change review', { exact: true }).filter({ visible: true }).first(), 'Daily change review', { post: 1500 });
    const add = page.getByRole('button', { name: /^Add$|Use template|Create/ }).filter({ visible: true }).first();
    if (await add.isVisible().catch(() => false)) await s.click(add, 'Add', { post: 1500 });
    await s.click(page.getByRole('button', { name: /Run now/ }).filter({ visible: true }).first(), 'Run now', { post: 2000 });
    s.speedFrom();
    await page.waitForTimeout(45000);
    s.speedTo();
    await s.wait(2500);
    await s.stop();
  },

  // Chapter 9: Usage & limits
  async c09(page) {
    await cleanAgents(page);
    const s = new Scene(page, 'c09'); await s.start();
    s.shot('usage-sidebar');
    const show = page.getByText('Show usage', { exact: true });
    if (await show.isVisible().catch(() => false)) await s.click(show, 'Show usage', { post: 1500 });
    const card = page.locator('section[aria-label="Usage"]').filter({ visible: true }).first();
    await s.box(card, 'Usage sidebar'); await s.wait(1500);
    await card.getByText('Claude', { exact: true }).filter({ visible: true }).first().hover(); await s.box(card.getByText('Claude', { exact: true }).filter({ visible: true }).first(), 'Hover for detail'); await s.wait(2500);
    s.shot('usage-page');
    await s.click(page.getByRole('button', { name: /View all usage/ }).filter({ visible: true }).first(), 'View all usage', { post: 2500 });
    const usageNav = page.locator('button', { hasText: /^Usage$/ }).last();
    if (await usageNav.isVisible().catch(() => false)) await s.click(usageNav, 'Usage', { post: 2000 });
    for (const t of ['Tokens', 'Limits', 'Cost']) await s.click(page.getByRole('tab', { name: t }).or(page.getByRole('button', { name: t, exact: true })).filter({ visible: true }).first(), t, { post: 2500 });
    for (const r of ['7 days', '90 days', 'Past 24h']) await s.click(page.getByRole('button', { name: r, exact: true }).or(page.getByText(r, { exact: true })).filter({ visible: true }).first(), r, { post: 1500 });
    await s.wait(4000);
    await s.stop();
  },

  // Chapter 10: Appearance
  async c10(page) {
    await cleanAgents(page);
    const s = new Scene(page, 'c10'); await s.start();
    s.shot('theme-scheme');
    await s.click(page.getByRole('button', { name: 'Settings' }).filter({ visible: true }).first(), 'Settings', { post: 1500 });
    await s.click(page.locator('button', { hasText: /^Appearance$/ }).filter({ visible: true }).first(), 'Appearance', { post: 1500 });
    for (const m of ['Light', 'Dark', 'System', 'Dark']) await s.click(page.getByRole('radio', { name: m }).or(page.getByText(m, { exact: true })).filter({ visible: true }).first(), m, { post: 1600 });
    s.shot('theme-cycle');
    for (const t of ['T3 Code', 'T3 Chat', 'Grove', 'Ocean', 'Ember', 'Iris', 'GenNal'])
      await s.click(page.getByRole('button', { name: `Use ${t} for both light and dark` }).filter({ visible: true }).first(), t, { post: 1700 });
    const more = page.getByText(/More themes/).filter({ visible: true }).first();
    if (await more.isVisible().catch(() => false)) { await s.click(more, 'More themes', { post: 2500 }); await s.click(more, 'More themes', { post: 800 }); }
    s.shot('theme-display');
    const contrast = page.getByRole('slider', { name: /Contrast/ }).filter({ visible: true }).first();
    if (await contrast.isVisible().catch(() => false)) {
      await contrast.scrollIntoViewIfNeeded(); await s.box(contrast, 'Contrast');
      await contrast.focus(); for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150); }
      await s.wait(800); for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(120); }
    }
    await s.box(page.getByRole('button', { name: /Create theme/ }).filter({ visible: true }).first(), 'Create theme'); await s.wait(1500);
    await s.click(page.locator('button', { hasText: /^Display$/ }).filter({ visible: true }).first(), 'Display', { post: 1800 });
    await s.click(page.locator('.settings-main').getByRole('button', { name: '110%', exact: true }).filter({ visible: true }).first(), '110%', { post: 2200 });
    await s.click(page.locator('.settings-main').getByRole('button', { name: '100%', exact: true }).filter({ visible: true }).first(), '100%', { post: 2000 });
    await s.click(page.getByText('Back to app').filter({ visible: true }).first(), 'Back to app', { post: 1500 });
    await s.stop();
  },

  // Chapter 11: GenNal Remote (desktop side)
  async c11(page) {
    await cleanAgents(page);
    await page.addStyleTag({ content: 'img[alt="Pairing QR code"]{filter:blur(14px)}' });
    const s = new Scene(page, 'c11'); await s.start();
    s.shot('remote-dialog');
    await s.click(page.locator('.account-chip, [title="GenNal account"]').filter({ visible: true }).first(), 'Account menu', { post: 1500 });
    await s.click(page.getByText('Connect a phone').filter({ visible: true }).first(), 'Connect a phone', { post: 2500 });
    await s.click(page.getByRole('tab', { name: 'Anywhere' }).filter({ visible: true }).first(), 'Anywhere', { post: 2500 });
    await s.box(page.getByRole('button', { name: /Sign in with Google/ }).last(), 'Sign in with Google'); await s.wait(2000);
    await s.click(page.getByRole('tab', { name: 'Same Wi-Fi' }).filter({ visible: true }).first(), 'Same Wi-Fi', { post: 3500 });
    await s.box(page.locator('img[alt="Pairing QR code"]').filter({ visible: true }).first(), 'Scan the code'); await s.wait(2500);
    s.shot('remote-pause');
    await s.key('Escape', 1000);
    await s.click(page.locator('.account-chip, [title="GenNal account"]').filter({ visible: true }).first(), 'Account menu', { post: 3000 });
    await s.key('Escape', 800);
    await s.stop();
  },
  async c07c(page) {
    await toIde(page);
    const s = new Scene(page, 'c07c'); await s.start();
    s.shot('editor-preview');
    await s.click(page.locator('.ide-agents-pill'), 'Agents Window', { post: 1200 });
    await cleanAgents(page);
    await s.click(page.getByText('Preview', { exact: true }).filter({ visible: true }).first(), 'Preview', { post: 1500 });
    await s.click(page.getByPlaceholder(/Enter a URL/).filter({ visible: true }).first(), 'URL', { post: 200 });
    await s.type('localhost:5173', { delay: 60 }); await s.key('Enter', 5000);
    await s.click(page.getByText('Sessions', { exact: true }).filter({ visible: true }).first(), 'Sessions', { post: 800 });
    await s.click(page.getByRole('button', { name: 'Open the IDE' }), 'IDE', { post: 1500 });
    s.shot('editor-db');
    await page.getByRole('button', { name: 'Hide agent chat' }).click().catch(() => {});
    await page.getByRole('button', { name: 'Close panel' }).filter({ visible: true }).first().click().catch(() => {});
    await s.click(page.getByRole('button', { name: 'Database Client' }).filter({ visible: true }).first(), 'Database Client', { post: 1500 });
    await page.locator('.db-side:visible').first().waitFor({ state: 'visible', timeout: 15000 });
    await stubPicker(`${H}/weather-app/data/app.db`);
    const addc = page.getByRole('button', { name: 'Add connection' }).filter({ visible: true }).last();
    if (await addc.isVisible().catch(() => false)) await s.click(addc, 'Add connection', { post: 1000 });
    else await s.click(page.locator('button[title="New connection"]:visible').first(), 'New connection', { post: 1000 });
    await s.click(page.getByPlaceholder('Local app database'), 'Name', { post: 200 });
    await s.type('Weather data', { delay: 50 });
    await s.click(page.getByRole('button', { name: /^Choose/ }).filter({ visible: true }).first(), 'Choose…', { post: 1000 });
    await s.click(page.getByRole('button', { name: 'Test connection' }), 'Test connection', { post: 1800 });
    await s.click(page.getByRole('button', { name: 'Save', exact: true }), 'Save', { post: 1800 });
    await stubPicker(`${H}/weather-app`);
    await s.click(page.getByText('cities', { exact: true }).filter({ visible: true }).first(), 'cities', { post: 2500 });
    await s.click(page.getByRole('button', { name: 'SQL', exact: true }).filter({ visible: true }).first(), 'SQL', { post: 1000 });
    await s.click(page.getByPlaceholder(/select \* from users/).filter({ visible: true }).first(), 'Query', { post: 200 });
    await s.type('select name, population from cities order by population desc;', { delay: 30 });
    await s.click(page.getByRole('button', { name: /^Run/ }).last(), 'Run', { post: 3000 });
    s.shot('editor-ext');
    await s.click(page.getByRole('button', { name: 'Extensions', exact: true }).filter({ visible: true }).first(), 'Extensions', { post: 1500 });
    await s.click(page.getByPlaceholder(/Search extensions/i).filter({ visible: true }).first(), 'Search extensions', { post: 200 });
    await s.type('Workspace Board', { delay: 50 }); await s.wait(1500);
    await s.click(page.getByText('Workspace Board', { exact: true }).filter({ visible: true }).first(), 'Workspace Board', { post: 1800 });
    await s.click(page.getByRole('button', { name: 'Install', exact: true }).filter({ visible: true }).last(), 'Install', { post: 1200 });
    await s.click(page.locator('[role=dialog] button', { hasText: 'Install' }).last(), 'Install', { post: 3000 });
    await s.click(page.locator('button.ce-rail-ext[aria-label="Workspace Board"]:visible').first(), 'Workspace Board', { post: 2500 });
    { const ob = page.getByRole('button', { name: 'Workspace Board: Open' }).filter({ visible: true }).first();
      if (await ob.isVisible().catch(() => false)) await s.click(ob, 'Workspace Board: Open', { post: 2000 }); }
    s.shot('editor-back');
    await s.click(page.locator('.ide-agents-pill'), 'Agents Window', { post: 3000 });
    await s.stop();
  },
};

await runScenes(scenes);
