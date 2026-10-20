// Poke the running app while writing scenes:  node cdp.mjs '<js using page>' [shot.png]
// e.g. node cdp.mjs 'return await page.locator("button").allInnerTexts()'
const H = await import('./harness.mjs');
const { b, page } = await H.connect();
const fn = new Function('page', 'H', `return (async () => { ${process.argv[2] || ''} })()`);
try { const r = await fn(page, H); if (r !== undefined) console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1)); }
catch (e) { console.log('ERR', e.message.split('\n')[0]); }
if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
await b.close().catch(() => {});
process.exit(0);
