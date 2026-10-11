/**
 * Drive the real UI the way a student would: sign up, build a chapter test,
 * answer it by clicking, submit, read the solutions, then look at analytics
 * and the study plan.
 *
 * This is the half the API smoke test cannot see: whether the crops actually
 * load, whether anything 404s, whether the page fits a phone. Screenshots are
 * written for review by eye.
 *
 *   node scripts/ui.mjs [outdir] [subject] [chapter]
 *
 * The subject and chapter arguments aim it at whichever part of the bank has
 * just changed -- a chapter that has only ever been served by one source is
 * the sharpest test of that source.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3000';
const SHOTS = process.argv[2] || './shots';
const SUBJECT = process.argv[3] || 'Physics';
const CHAPTER = process.argv[4] || '';
fs.mkdirSync(SHOTS, { recursive: true });

const problems = [];
const note = (m) => { console.log('  ! ' + m); problems.push(m); };
const step = (m) => console.log('\n== ' + m);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();

// Surface anything the page itself complains about.
page.on('console', (m) => {
  if (m.type() === 'error') note(`console error: ${m.text().slice(0, 200)}`);
});
page.on('pageerror', (e) => note(`page error: ${String(e).slice(0, 200)}`));
page.on('requestfailed', (r) => {
  const u = r.url();
  if (!u.startsWith(BASE)) return;
  // Next cancels its own route prefetches when you navigate before they
  // land. They abort by design and say nothing about the page.
  if (u.includes('?_rsc=') && r.failure()?.errorText === 'net::ERR_ABORTED') return;
  note(`request failed: ${u.replace(BASE, '')} (${r.failure()?.errorText})`);
});
page.on('response', (r) => {
  if (r.url().startsWith(BASE) && r.status() >= 400) {
    note(`HTTP ${r.status()} on ${r.url().replace(BASE, '')}`);
  }
});

const shot = async (name) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

try {
  step('Landing page');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  console.log('  title:', await page.title());
  const h1 = await page.locator('h1').first().innerText();
  console.log('  headline:', h1.slice(0, 70));
  await shot('01-landing');

  step('Register');
  const email = `ui${Date.now()}@kcetprep.test`;
  await page.click('text=Create a free account');
  await page.waitForURL('**/register');
  await page.fill('#name', 'Asha Rao');
  await page.fill('#email', email);
  await page.fill('#password', 'testpass123');
  await shot('02-register');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  console.log('  signed in as', email);
  await page.waitForLoadState('networkidle');
  await shot('03-dashboard-empty');

  step('Build a chapter test');
  await page.click('a[href="/practice"]');
  await page.waitForURL('**/practice');
  await page.waitForSelector('text=Chapter drill');
  await page.click('text=Chapter drill');
  await page.waitForTimeout(400);
  await page.locator(`button:has-text("${SUBJECT}")`).first().click();
  await page.waitForTimeout(600);
  await shot('04-practice-builder');

  // the chapter asked for, else whichever one is offered first
  const all = page.locator('label:has(input[type=checkbox])');
  const wanted = CHAPTER ? all.filter({ hasText: CHAPTER }).first() : all.first();
  const firstChapter = (await wanted.count()) ? wanted : all.first();
  if (CHAPTER && !(await wanted.count())) note(`chapter "${CHAPTER}" was not offered`);
  const chapterName = (await firstChapter.innerText()).trim();
  await firstChapter.click();
  console.log('  chapter chosen:', chapterName.replace(/\s+/g, ' '));

  // Exact text for the count, not a substring: the subject chips carry their
  // own question count, so has-text("10") also matches "Physics 1006" and
  // quietly switches the test to another subject.
  await page.locator('button:text-is("10")').first().click();
  const secure = page.locator('label:has-text("Exam mode") input[type=checkbox]');
  const secureBox = (await secure.count()) ? secure.first() : page.locator('input[type=checkbox]').last();
  if (await secureBox.isChecked()) await secureBox.uncheck();
  await shot('05-ready-to-start');

  const startBtn = page.locator('button:has-text("Start test")');
  console.log('  start enabled:', await startBtn.isEnabled());
  await startBtn.click();
  await page.waitForURL('**/test/**', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  step('Take the test');
  const timer = await page.locator('[role=timer]').innerText();
  console.log('  timer shows:', timer.replace(/\s+/g, ' '));
  const qImgs = await page.locator('main img').count();
  console.log('  images rendered on question 1:', qImgs);
  if (qImgs === 0) note('no question images rendered');

  // check the crops actually loaded rather than 404ing
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
  );
  if (broken) note(`${broken} broken images on the question page`);
  await shot('06-test-q1');

  // Answer all ten by clicking, marking one for review. Two layouts have to
  // be handled: lettered rows when the options are their own crops, and a
  // four-button strip when they are printed inside the question image.
  for (let i = 0; i < 10; i++) {
    const choice = i % 4;
    const strip = page.locator('main div.grid button');
    if (await strip.count()) {
      const label = (await strip.nth(choice).innerText()).trim();
      if (i === 0) console.log('  options are marked:', (await strip.allInnerTexts()).join(' ').replace(/\s+/g, ' '));
      if (!/^[a-d1-4]$/.test(label)) note(`option button reads "${label}"`);
      await strip.nth(choice).click();
    } else {
      const letter = ['A', 'B', 'C', 'D'][choice];
      await page.locator(`main button:has(span:text-is("${letter}"))`).first().click();
    }
    await page.waitForTimeout(120);
    if (i === 2) await page.click('button:has-text("Mark for review")');
    if (i < 9) {
      await page.click('button:has-text("Save & next")');
      await page.waitForTimeout(220);
    }
  }
  await shot('07-test-answered');

  const palette = await page.locator('aside').innerText();
  console.log('  palette summary:', palette.replace(/\s+/g, ' ').slice(0, 150));

  step('Submit');
  await page.click('button:has-text("Submit test")');
  await page.waitForSelector('text=Submit this test?');
  await shot('08-submit-confirm');
  await page.locator('div[class*="fixed"] button:has-text("Submit")').last().click();
  await page.waitForURL('**/results/**', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  step('Results');
  const score = await page.locator('p.text-4xl').first().innerText();
  console.log('  score:', score.replace(/\s+/g, ' '));
  await shot('09-results');

  // open a solution
  const solBtn = page.locator('button:has-text("Show step-by-step solution")').first();
  if (await solBtn.count()) {
    await solBtn.click();
    await page.waitForTimeout(500);
    const sol = await page.locator('text=Solution').first().isVisible();
    console.log('  solution panel visible:', sol);
    await shot('10-solution-open');
  } else {
    note('no "show solution" button found on results');
  }

  await page.click('button:has-text("Everything")');
  await page.waitForTimeout(300);
  const brokenRes = await page.evaluate(() =>
    [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
  );
  if (brokenRes) note(`${brokenRes} broken images on the results page`);
  await shot('11-results-all');

  step('Analytics');
  await page.goto(`${BASE}/analytics`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  console.log('  heading:', await page.locator('h1').first().innerText());
  const heat = await page.locator('text=Practice activity').count();
  console.log('  heatmap present:', heat > 0);
  await shot('12-analytics');

  step('Study plan');
  await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const tasks = await page.locator('li:has(input[type=checkbox])').count();
  console.log('  plan tasks listed:', tasks);
  if (tasks === 0) note('study plan rendered no tasks');
  await shot('13-plan');

  step('My tests');
  await page.goto(`${BASE}/tests`, { waitUntil: 'networkidle' });
  const rowCount = await page.locator('li.card').count();
  console.log('  tests listed:', rowCount);
  await shot('14-tests');

  step('Mobile layout');
  const m = await ctx.newPage();
  await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  // scrollWidth against clientWidth, not innerWidth: innerWidth counts the
  // scrollbar, and the heatmap is *meant* to scroll inside its own box, so
  // only the document scrolling sideways is a fault.
  const page390 = await m.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  console.log(`  document width: ${page390.scroll} in a ${page390.client} viewport`);
  if (page390.scroll > page390.client + 2) note('dashboard scrolls sideways on a 390px screen');
  await m.screenshot({ path: `${SHOTS}/15-mobile-dashboard.png`, fullPage: true });
  await m.close();
} catch (e) {
  note('THREW: ' + String(e).split('\n').slice(0, 4).join(' | '));
  await shot('99-failure');
}

await browser.close();
console.log('\n' + (problems.length ? `${problems.length} problem(s) found:` : 'No problems found.'));
problems.forEach((p, i) => console.log(` ${i + 1}. ${p}`));
