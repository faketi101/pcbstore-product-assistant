// ==UserScript==
// @name         Google Index Checker
// @namespace    tarikul.dev/index-checker
// @version      1.0.0
// @description  Paste a list of URLs, check whether each is indexed on Google (via site: search), and export the results to XLSX.
// @author       Tarikul
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      www.google.com
// @connect      google.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  State
   * ------------------------------------------------------------------ */
  let queue = GM_getValue('gic_queue', []);
  let results = GM_getValue('gic_results', []);
  let currentIndex = GM_getValue('gic_currentIndex', 0);
  let isRunning = false;
  let currentRequest = null;

  const DEFAULTS = { minDelay: 8, maxDelay: 15 };

  /* ------------------------------------------------------------------ *
   *  Styles
   * ------------------------------------------------------------------ */
  GM_addStyle(`
    #gic-toggle-btn {
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      width: 52px; height: 52px; border-radius: 50%;
      background: #1a73e8; color: #fff; border: none;
      font-size: 22px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.3);
    }
    #gic-panel {
      position: fixed; bottom: 84px; right: 20px; z-index: 999999;
      width: 420px; max-height: 78vh; display: none; flex-direction: column;
      background: #fff; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,.35);
      font-family: -apple-system, Segoe UI, Roboto, sans-serif; font-size: 13px; color: #202124;
      overflow: hidden;
    }
    #gic-panel.gic-open { display: flex; }
    #gic-header {
      background: #1a73e8; color: #fff; padding: 10px 14px;
      display: flex; justify-content: space-between; align-items: center; font-weight: 600;
    }
    #gic-header span.gic-close { cursor: pointer; font-weight: 400; }
    #gic-body { padding: 12px 14px; overflow-y: auto; }
    #gic-urls {
      width: 100%; height: 90px; box-sizing: border-box; resize: vertical;
      font-family: monospace; font-size: 12px; padding: 6px; border: 1px solid #dadce0; border-radius: 6px;
    }
    .gic-row { display: flex; gap: 8px; margin-top: 8px; align-items: center; }
    .gic-row label { flex: 1; color: #5f6368; }
    .gic-row input[type=number] { width: 60px; padding: 3px 6px; border: 1px solid #dadce0; border-radius: 4px; }
    .gic-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .gic-actions button {
      flex: 1; padding: 7px 8px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;
    }
    #gic-start { background: #188038; color: #fff; }
    #gic-stop { background: #d93025; color: #fff; }
    #gic-export { background: #1a73e8; color: #fff; }
    #gic-clear { background: #f1f3f4; color: #202124; }
    #gic-progress { margin-top: 8px; font-size: 12px; color: #5f6368; }
    #gic-bar-track { background: #e8eaed; border-radius: 4px; height: 6px; margin-top: 4px; overflow: hidden; }
    #gic-bar-fill { background: #1a73e8; height: 100%; width: 0%; transition: width .2s; }
    #gic-results { margin-top: 10px; max-height: 220px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; }
    #gic-results table { width: 100%; border-collapse: collapse; font-size: 11px; }
    #gic-results th, #gic-results td { padding: 4px 6px; border-bottom: 1px solid #f1f1f1; text-align: left; }
    #gic-results th { position: sticky; top: 0; background: #f8f9fa; }
    .gic-status-Indexed { color: #188038; font-weight: 600; }
    .gic-status-Not.Indexed, .gic-status-NotIndexed { color: #d93025; font-weight: 600; }
    .gic-status-Blocked { color: #f9ab00; font-weight: 600; }
    .gic-status-Error, .gic-status-Unknown { color: #5f6368; font-weight: 600; }
    #gic-warning { font-size: 11px; color: #5f6368; margin-top: 6px; line-height: 1.4; }
  `);

  /* ------------------------------------------------------------------ *
   *  UI
   * ------------------------------------------------------------------ */
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'gic-toggle-btn';
  toggleBtn.title = 'Google Index Checker';
  toggleBtn.textContent = '🔍';
  document.body.appendChild(toggleBtn);

  const panel = document.createElement('div');
  panel.id = 'gic-panel';
  panel.innerHTML = `
    <div id="gic-header">
      <span>Google Index Checker</span>
      <span class="gic-close">✕</span>
    </div>
    <div id="gic-body">
      <textarea id="gic-urls" placeholder="One URL per line&#10;https://example.com/page-1&#10;https://example.com/page-2"></textarea>
      <div class="gic-row">
        <label>Min delay (sec)</label>
        <input type="number" id="gic-min-delay" min="3" value="${DEFAULTS.minDelay}">
      </div>
      <div class="gic-row">
        <label>Max delay (sec)</label>
        <input type="number" id="gic-max-delay" min="4" value="${DEFAULTS.maxDelay}">
      </div>
      <div class="gic-actions">
        <button id="gic-start">▶ Start</button>
        <button id="gic-stop">⏸ Stop</button>
      </div>
      <div class="gic-actions">
        <button id="gic-export">⬇ Export XLSX</button>
        <button id="gic-clear">🗑 Clear</button>
      </div>
      <div id="gic-progress">Idle</div>
      <div id="gic-bar-track"><div id="gic-bar-fill"></div></div>
      <div id="gic-results"><table><thead>
        <tr><th>#</th><th>URL</th><th>Status</th><th>Detail</th></tr>
      </thead><tbody id="gic-results-body"></tbody></table></div>
      <div id="gic-warning">
        This checks Google's public search results page, which is against Google's Terms of Service
        for automated use and will trigger a CAPTCHA if you run large batches or short delays.
        Keep batches small (a few dozen), keep the delay high, and stop immediately if status
        shows "Blocked".
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  toggleBtn.addEventListener('click', () => panel.classList.toggle('gic-open'));
  panel.querySelector('.gic-close').addEventListener('click', () => panel.classList.remove('gic-open'));

  const urlsEl = document.getElementById('gic-urls');
  const minDelayEl = document.getElementById('gic-min-delay');
  const maxDelayEl = document.getElementById('gic-max-delay');
  const progressEl = document.getElementById('gic-progress');
  const barFillEl = document.getElementById('gic-bar-fill');
  const resultsBodyEl = document.getElementById('gic-results-body');

  document.getElementById('gic-start').addEventListener('click', onStart);
  document.getElementById('gic-stop').addEventListener('click', onStop);
  document.getElementById('gic-export').addEventListener('click', exportToXlsx);
  document.getElementById('gic-clear').addEventListener('click', onClear);

  /* ------------------------------------------------------------------ *
   *  Helpers
   * ------------------------------------------------------------------ */
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function randomDelayMs(minSec, maxSec) {
    const min = Math.max(3, minSec) * 1000;
    const max = Math.max(min + 1000, maxSec * 1000);
    return Math.floor(min + Math.random() * (max - min));
  }
  function saveState() {
    GM_setValue('gic_queue', queue);
    GM_setValue('gic_results', results);
    GM_setValue('gic_currentIndex', currentIndex);
  }
  function normalizeUrl(u) {
    u = u.trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }

  function parseGoogleResponse(html) {
    if (/id="captcha-form"|recaptcha|Our systems have detected unusual traffic/i.test(html)) {
      return { status: 'Blocked', detail: 'CAPTCHA triggered — solve manually on google.com, then resume' };
    }
    if (/consent\.google\.com|Before you continue to Google/i.test(html)) {
      return { status: 'Blocked', detail: 'Cookie consent page — open google.com and accept cookies first' };
    }
    if (/did not match any documents|No results found for/i.test(html)) {
      return { status: 'Not Indexed', detail: 'No results returned' };
    }
    const countMatch = html.match(/About ([\d,.]+) results/i) || html.match(/id="result-stats"[^>]*>([^<]*)</i);
    if (/id="result-stats"/i.test(html) || countMatch) {
      return { status: 'Indexed', detail: countMatch ? countMatch[1].trim() : 'Results found' };
    }
    return { status: 'Unknown', detail: 'Could not parse response — Google markup may have changed' };
  }

  function checkUrl(url) {
    return new Promise((resolve) => {
      const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent('site:' + url) + '&num=10';
      currentRequest = GM_xmlhttpRequest({
        method: 'GET',
        url: searchUrl,
        headers: { 'Accept-Language': 'en-US,en;q=0.9' },
        timeout: 20000,
        onload: (res) => resolve(parseGoogleResponse(res.responseText || '')),
        onerror: () => resolve({ status: 'Error', detail: 'Request failed' }),
        ontimeout: () => resolve({ status: 'Error', detail: 'Timed out' }),
      });
    });
  }

  /* ------------------------------------------------------------------ *
   *  Queue runner
   * ------------------------------------------------------------------ */
  async function onStart() {
    if (isRunning) return;
    if (currentIndex === 0 || queue.length === 0) {
      const parsed = urlsEl.value.split('\n').map(normalizeUrl).filter(Boolean);
      if (parsed.length === 0) { alert('Paste at least one URL first.'); return; }
      queue = parsed;
      results = [];
      currentIndex = 0;
      saveState();
    }
    isRunning = true;
    const minD = parseFloat(minDelayEl.value) || DEFAULTS.minDelay;
    const maxD = parseFloat(maxDelayEl.value) || DEFAULTS.maxDelay;

    for (; currentIndex < queue.length; currentIndex++) {
      if (!isRunning) break;
      const url = queue[currentIndex];
      progressEl.textContent = `Checking ${currentIndex + 1} / ${queue.length}: ${url}`;
      const result = await checkUrl(url);
      results.push({ url, status: result.status, detail: result.detail, checkedAt: new Date().toLocaleString() });
      saveState();
      renderResults();
      updateProgressBar();

      if (result.status === 'Blocked') {
        isRunning = false;
        progressEl.textContent = 'Paused — CAPTCHA/consent wall hit. Resolve it in a normal tab, then click Start to resume.';
        break;
      }
      if (currentIndex < queue.length - 1 && isRunning) {
        await sleep(randomDelayMs(minD, maxD));
      }
    }
    if (isRunning) progressEl.textContent = `Done — ${results.length} / ${queue.length} checked.`;
    isRunning = false;
  }

  function onStop() {
    isRunning = false;
    if (currentRequest && currentRequest.abort) currentRequest.abort();
    progressEl.textContent = `Stopped at ${currentIndex} / ${queue.length}. Click Start to resume.`;
  }

  function onClear() {
    if (isRunning) onStop();
    queue = []; results = []; currentIndex = 0;
    saveState();
    urlsEl.value = '';
    renderResults();
    updateProgressBar();
    progressEl.textContent = 'Idle';
  }

  function updateProgressBar() {
    const pct = queue.length ? Math.round((results.length / queue.length) * 100) : 0;
    barFillEl.style.width = pct + '%';
  }

  function renderResults() {
    resultsBodyEl.innerHTML = results.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td title="${r.url}">${r.url.length > 32 ? r.url.slice(0, 32) + '…' : r.url}</td>
        <td class="gic-status-${r.status.replace(/\s/g, '')}">${r.status}</td>
        <td>${r.detail || ''}</td>
      </tr>
    `).join('');
  }

  /* ------------------------------------------------------------------ *
   *  Export
   * ------------------------------------------------------------------ */
  function exportToXlsx() {
    if (results.length === 0) { alert('No results yet — run a check first.'); return; }
    const rows = [['#', 'URL', 'Status', 'Checked At', 'Detail']];
    results.forEach((r, i) => rows.push([i + 1, r.url, r.status, r.checkedAt, r.detail]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 4 }, { wch: 50 }, { wch: 14 }, { wch: 20 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Index Check');
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    XLSX.writeFile(wb, `google-index-report-${stamp}.xlsx`);
  }

  /* ------------------------------------------------------------------ *
   *  Restore previous session on load
   * ------------------------------------------------------------------ */
  if (results.length) {
    renderResults();
    updateProgressBar();
    progressEl.textContent = `Restored previous session: ${results.length} / ${queue.length} checked.`;
  }
  if (queue.length) {
    urlsEl.value = queue.join('\n');
  }
})();
