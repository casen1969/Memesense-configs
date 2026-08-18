(() => {
  'use strict';

  const PAGE_SIZE = 6;

  const STORE_KEY = 'ms_configs';

  const featuredGrid = document.getElementById('featuredGrid');
  const configsGrid = document.getElementById('configsGrid');
  const leaderboardList = document.getElementById('leaderboardList');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const loadMoreBtn = document.getElementById('loadMore');
  const emptyState = document.getElementById('emptyState');
  const modal = document.getElementById('configModal');
  const modalContent = document.getElementById('modalContent');
  const modalClose = document.getElementById('modalClose');
  const uploadForm = document.getElementById('uploadForm');
  const uploadStatus = document.getElementById('uploadStatus');

  const categories = ['rage', 'legit', 'semi-rage', 'esp', 'misc'];

  let allConfigs = [];
  let renderedCount = 0;

  // ---- Local storage helpers ----
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
  };

  function loadData() {
    const uploaded = store.get(STORE_KEY, []);
    return [...uploaded, ...allConfigs];
  }

  function saveUploads(uploads) {
    store.set(STORE_KEY, uploads);
  }

  // ---- Rendering ----
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const then = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(then)) return '';
    const secs = Math.floor((Date.now() - then.getTime()) / 1000);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function tagsHtml(cfg) {
    return (cfg.tags || []).slice(0, 3).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  }

  function getVersions(cfg) {
    if (cfg.versions && cfg.versions.length) return cfg.versions;
    return [{ version: '1.0', code: cfg.code, date: cfg.created_at, changes: (cfg.changelog || []).flatMap((e) => e.changes || []) }];
  }

  function latestVersion(cfg) {
    const v = getVersions(cfg);
    return v.length ? v[0].version : '1.0';
  }

  function cardHtml(cfg) {
    return `
      <article class="config-card" data-id="${cfg.id}" id="config-${cfg.id}">
        <div class="card-top">
          <span class="card-badge">${escapeHtml(cfg.category)}</span>
          <span class="card-version">v${escapeHtml(latestVersion(cfg))}</span>
        </div>
        <h3 class="card-title">${escapeHtml(cfg.title)}</h3>
        <p class="card-desc">by <strong>${escapeHtml(cfg.author)}</strong></p>
        <div class="card-tags">${tagsHtml(cfg)}</div>
      </article>`;
  }

  function filteredConfigs() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const cat = categoryFilter.value;
    return loadData()
      .filter((c) => {
        const matchQ =
          !q ||
          c.title.toLowerCase().includes(q) ||
          c.author.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchCat = cat === 'all' || c.category === cat;
        return matchQ && matchCat;
      })
      .sort((a, b) => b.id - a.id);
  }

  function renderConfigs() {
    const list = filteredConfigs();
    const slice = list.slice(0, renderedCount);
    configsGrid.innerHTML = slice.map(cardHtml).join('');
    emptyState.classList.toggle('hidden', slice.length > 0);
    loadMoreBtn.classList.toggle('hidden', renderedCount >= list.length || list.length === 0);
  }

  function renderFeatured() {
    const list = loadData();
    const featured = list.filter((c) => c.featured).slice(0, 3);
    featuredGrid.innerHTML = (featured.length ? featured : list.slice(0, 3)).map(cardHtml).join('');
  }

  function renderLeaderboard() {
    const counts = {};
    loadData().forEach((c) => {
      counts[c.author] = (counts[c.author] || 0) + 1;
    });
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    leaderboardList.innerHTML = top.length
      ? top
          .map(
            ([name, count], i) => `
            <div class="lb-row">
              <span class="lb-rank">${i + 1}</span>
              <span class="lb-name">${escapeHtml(name)}</span>
              <span class="lb-count">${count} config${count > 1 ? 's' : ''}</span>
            </div>`
          )
          .join('')
      : '<div class="empty-state">No uploaders yet.</div>';
  }

  function renderStats() {
    const configs = loadData().length;
    setCount('statConfigs', configs);
  }

  function setCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- Modal ----
  function getById(id) {
    return loadData().find((c) => c.id === id);
  }

  function versionSelectHtml(cfg) {
    const versions = getVersions(cfg);
    if (versions.length < 2) return '';
    const options = versions
      .map(
        (v, i) =>
          `<option value="${escapeHtml(v.version)}"${i === 0 ? ' selected' : ''}>v${escapeHtml(v.version)}</option>`
      )
      .join('');
    return `
      <div class="version-row">
        <label class="version-label" for="versionSelect">Version</label>
        <select id="versionSelect" class="select" aria-label="Select config version">
          ${options}
        </select>
      </div>`;
  }

  function changelogHtml(cfg) {
    const versions = getVersions(cfg);
    const withChanges = versions.filter((v) => (v.changes || []).length);
    if (!withChanges.length) return '';
    const items = withChanges
      .map(
        (entry) => `
        <div class="cl-item">
          <div class="cl-head">
            <span class="cl-version">v${escapeHtml(entry.version)}</span>
            <span class="cl-date">${escapeHtml(entry.date || '')}</span>
          </div>
          <ul class="cl-changes">
            ${(entry.changes || []).map((c) => `<li>${escapeHtml(c)}</li>`).join('')}
          </ul>
        </div>`
      )
      .join('');
    return `
      <div class="changelog">
        <h4 class="changelog-title">Changelog</h4>
        ${items}
      </div>`;
  }

  function openModal(cfg) {
    let current = cfg;
    const versions = getVersions(current);
    let currentVersion = versions.length ? versions[0] : null;
    let activeCode = currentVersion ? currentVersion.code : current.code;

    const safetyWarning = ['rage', 'semi-rage'].includes(current.category)
      ? `<div class="safety-warning" role="alert">
          <strong>Safety warning:</strong> Rage & semi-rage configs are riskier. Set <code>fps_max 86</code> to reduce your chances of getting detected.
        </div>`
      : '';

    modalContent.innerHTML = `
      <div class="modal-head">
        <span class="card-badge">${escapeHtml(current.category)}</span>
        <h3 class="modal-title" id="modalTitle">${escapeHtml(current.title)}</h3>
      </div>
      <div class="modal-meta">
        <span>Author: <strong>${escapeHtml(current.author)}</strong></span>
        <span>${timeAgo(current.created_at) || ''}</span>
      </div>
      ${safetyWarning}
      ${versionSelectHtml(current)}
      <div class="code-block" id="modalCode">${escapeHtml(activeCode)}</div>
      ${changelogHtml(current)}
      <div class="modal-actions">
        <button class="btn btn-primary btn-sm" data-copy>Copy Config Code</button>
        <button class="btn btn-ghost btn-sm" data-download>Download .cfg</button>
      </div>`;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const versionSelect = modalContent.querySelector('#versionSelect');
    if (versionSelect) {
      versionSelect.addEventListener('change', () => {
        const v = versions.find((x) => x.version === versionSelect.value);
        if (v) {
          currentVersion = v;
          activeCode = v.code;
          modalContent.querySelector('#modalCode').textContent = activeCode;
        }
      });
    }

    modalContent.querySelector('[data-copy]').addEventListener('click', async () => {
      const btn = modalContent.querySelector('[data-copy]');
      try {
        await navigator.clipboard.writeText(activeCode);
        btn.textContent = 'Copied!';
      } catch {
        btn.textContent = 'Copy failed';
      }
      setTimeout(() => (btn.textContent = 'Copy Config Code'), 1600);
    });

    modalContent.querySelector('[data-download]').addEventListener('click', () => {
      const blob = new Blob([activeCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const suffix = currentVersion ? `_v${currentVersion.version}` : '';
      a.href = url;
      a.download = `${current.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}${suffix}.cfg`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ---- Events ----
  featuredGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.config-card');
    if (!card) return;
    const cfg = getById(Number(card.dataset.id));
    if (cfg) openModal(cfg);
  });

  configsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.config-card');
    if (!card) return;
    const cfg = getById(Number(card.dataset.id));
    if (cfg) openModal(cfg);
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      renderedCount = PAGE_SIZE;
      renderConfigs();
    }, 300);
  });
  categoryFilter.addEventListener('change', () => {
    renderedCount = PAGE_SIZE;
    renderConfigs();
  });
  loadMoreBtn.addEventListener('click', () => {
    renderedCount += PAGE_SIZE;
    renderConfigs();
  });

  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });
    navLinks.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => navLinks.classList.remove('open'))
    );
  }

  document.querySelectorAll('[data-open-upload]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const target = document.getElementById('upload');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    })
  );

  uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('cfgName').value.trim();
    const category = document.getElementById('cfgCategory').value;
    const author = document.getElementById('cfgAuthor').value.trim();
    const code = document.getElementById('cfgCode').value.trim();
    const tagsRaw = document.getElementById('cfgTags').value.trim();
    const changelogRaw = document.getElementById('cfgChangelog').value.trim();

    if (!title || !category || !author || !code) {
      uploadStatus.classList.add('error');
      uploadStatus.textContent = 'Please fill in all required fields.';
      return;
    }

    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [category];

    const changes = changelogRaw
      ? changelogRaw.split('\n').map((l) => l.trim()).filter(Boolean)
      : [];
    const changelog = changes.length
      ? [
          {
            version: '1.0',
            date: new Date().toISOString().slice(0, 10),
            changes,
          },
        ]
      : [];

    const newConfig = {
      id: Date.now(),
      title,
      category,
      author,
      tags,
      featured: false,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      code,
    };
    if (changelog.length) newConfig.changelog = changelog;

    const uploads = store.get(STORE_KEY, []);
    uploads.unshift(newConfig);
    saveUploads(uploads);

    uploadStatus.classList.remove('error');
    uploadStatus.textContent = 'Saved in your browser! Copy the block below and paste it into configs.js to publish it for everyone.';
    showRepoJson(newConfig);
    uploadForm.reset();

    renderFeatured();
    renderLeaderboard();
    renderStats();
    renderedCount = PAGE_SIZE;
    renderConfigs();
    const card = configsGrid.querySelector(`[data-id="${newConfig.id}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function showRepoJson(cfg) {
    let existing = document.getElementById('repoJsonBox');
    if (!existing) {
      const wrap = document.createElement('div');
      wrap.className = 'repo-json';
      wrap.innerHTML = `
        <p class="upload-status">To publish this config to everyone, add this object to <code>configs.js</code> (inside the <code>window.CONFIGS = [...]</code> array) and commit:</p>
        <textarea id="repoJsonText" rows="6" readonly></textarea>
        <button type="button" class="btn btn-ghost btn-sm" id="copyRepoJson">Copy JSON</button>`;
      uploadStatus.after(wrap);
      wrap.querySelector('#copyRepoJson').addEventListener('click', () => {
        const textarea = document.getElementById('repoJsonText');
        navigator.clipboard.writeText(textarea.value).then(() => {
          const btn = document.getElementById('copyRepoJson');
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = 'Copy JSON'), 1600);
        });
      });
      existing = wrap;
    }
    document.getElementById('repoJsonText').value = JSON.stringify(
      {
        id: cfg.id,
        title: cfg.title,
        category: cfg.category,
        author: cfg.author,
        tags: cfg.tags,
        featured: false,
        created_at: cfg.created_at,
        code: cfg.code,
        ...(cfg.changelog ? { changelog: cfg.changelog } : {}),
        ...(cfg.versions ? { versions: cfg.versions } : {}),
      },
      null,
      2
    );
  }

  // ---- Init ----
  categories.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
    categoryFilter.appendChild(opt);
  });

  function injectStructuredData() {
    try {
      const base = document.querySelector('link[rel="canonical"]')?.href || location.href;
      const items = allConfigs.map((c) => ({
        '@type': 'SoftwareApplication',
        name: c.title,
        applicationCategory: 'GameApplication',
        author: { '@type': 'Person', name: c.author },
        description: `${c.title} MemeSense config by ${c.author}. Category: ${c.category}.`,
        url: `${base}#config-${c.id}`,
        ...(getVersions(c).length ? { softwareVersion: latestVersion(c) } : {}),
      }));
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'config-list-ld';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'MemeSense Config Database',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item,
        })),
      });
      const existing = document.getElementById('config-list-ld');
      if (existing) existing.remove();
      document.head.appendChild(script);
    } catch {}
  }

  async function init() {
    if (!Array.isArray(window.CONFIGS)) {
      allConfigs = [];
      configsGrid.innerHTML = `<div class="empty-state">Config data not found. Check that <code>configs.js</code> is loaded before <code>script.js</code> in index.html.</div>`;
      return;
    }
    allConfigs = window.CONFIGS;
    renderFeatured();
    renderLeaderboard();
    renderStats();
    injectStructuredData();
    renderedCount = PAGE_SIZE;
    renderConfigs();
  }
  init();
})();