// Tes asap (smoke test) setelah build: buka beberapa halaman hasil build
// produksi di browser sungguhan dan pastikan TIDAK ada layar blank / error JS.
// Dipakai oleh GitHub Actions (.github/workflows/ci.yml), bisa juga dijalankan
// manual:  npm run build && npx vite preview --port 4173 & node scripts/smoke-test.mjs
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4173';
const PATHS = ['/', '/login', '/dashboard', '/kalkulator/riwayat', '/monitoring/dashboard', '/about'];

// Error jaringan ke Supabase/Google Fonts wajar di CI (tidak ada login) — yang
// dicari adalah error JavaScript yang bikin aplikasi crash.
const IGNORED = [/Failed to fetch/i, /NetworkError/i, /WebSocket/i, /Load failed/i];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
let failed = false;

for (const path of PATHS) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => {
    if (!IGNORED.some((re) => re.test(e.message))) errors.push(e.message);
  });
  try {
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(2500);
    const len = await page.evaluate(() => document.getElementById('root')?.innerHTML.length ?? 0);
    const ok = len > 500 && errors.length === 0;
    console.log(`${ok ? 'OK  ' : 'GAGAL'} ${path} -> ${page.url().replace(BASE, '')} (root ${len} karakter)`);
    if (!ok) {
      failed = true;
      if (len <= 500) console.log('      Halaman kosong / blank screen.');
      errors.forEach((e) => console.log('      Error JS:', e));
    }
  } catch (e) {
    failed = true;
    console.log(`GAGAL ${path}: ${e.message}`);
  }
  await page.close();
}

await browser.close();
if (failed) {
  console.error('\nSmoke test GAGAL — jangan di-merge sebelum diperbaiki.');
  process.exit(1);
}
console.log('\nSemua halaman terbuka normal.');
