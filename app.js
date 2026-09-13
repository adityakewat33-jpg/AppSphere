let currentApps = [];
let activeCategory = 'All';
let activeDevice = 'phone';
let activeApp = null;
let selectedStarRating = 5;
let selectedScreenshotFiles = [];

const DB_VERSION = 'v9_real_zero_mock_playstore';

// Purge any old mock data from browser localStorage
if (localStorage.getItem('appsphere_db_version') !== DB_VERSION) {
  localStorage.removeItem('appsphere_apps');
  localStorage.setItem('appsphere_db_version', DB_VERSION);
}

// DOM Elements
const topChartsGrid = document.getElementById('topChartsGrid');
const recommendedGrid = document.getElementById('recommendedGrid');
const toolsGrid = document.getElementById('toolsGrid');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

// Modals
const detailModal = document.getElementById('detailModal');
const closeDetailBtn = document.getElementById('closeDetailBtn');
const uploadModal = document.getElementById('uploadModal');
const openUploadBtn = document.getElementById('openUploadBtn');
const closeUploadBtn = document.getElementById('closeUploadBtn');
const cancelUploadBtn = document.getElementById('cancelUploadBtn');

// Default Seeded Official Release Apps (Zero mock reviews & zero mock downloads)
const DEFAULT_APPS = [
  {
    id: "flapmaster",
    title: "FlapMaster Arcade",
    developer: "Aditya Kewat",
    category: "Games",
    subcategory: "Arcade",
    rating: 0.0,
    ratingCount: 0,
    downloads: 0,
    size: "18.5 MB",
    version: "2.1.0",
    packageName: "com.adityakewat.flapmaster",
    icon: "uploads/icons/flapmaster.png",
    banner: "uploads/screenshots/fm1.jpeg",
    description: "Fly through dynamic obstacle courses with powerful shields, time-slow potions, custom tail particle trails, daily lucky wheel rewards, and global Firebase leaderboards!",
    apkUrl: "uploads/apks/flapmaster.apk",
    badge: "Release Version",
    screenshots: [
      "uploads/screenshots/fm1.jpeg",
      "uploads/screenshots/fm2.jpeg",
      "uploads/screenshots/fm3.jpeg",
      "uploads/screenshots/fm4.jpeg"
    ],
    reviews: []
  },
  {
    id: "statussaver",
    title: "Status Saver & Insta Downloader",
    developer: "Aditya Kewat",
    category: "Tools",
    subcategory: "Utilities",
    rating: 0.0,
    ratingCount: 0,
    downloads: 0,
    size: "16.5 MB",
    version: "1.0.0",
    packageName: "com.statussaver.app",
    icon: "uploads/icons/statussaver.svg",
    banner: "uploads/screenshots/ss1.jpeg",
    description: "Save WhatsApp status photos & videos with one tap and download public Instagram Reels, IGTV videos, and posts directly to your phone gallery in high resolution!",
    apkUrl: "uploads/apks/statussaver.apk",
    badge: "Release Version",
    screenshots: [
      "uploads/screenshots/ss1.jpeg",
      "uploads/screenshots/ss2.jpeg",
      "uploads/screenshots/ss3.jpeg",
      "uploads/screenshots/ss4.jpeg"
    ],
    reviews: []
  },
  {
    id: "blastgrid",
    title: "BlastGrid",
    developer: "Aditya Kewat",
    category: "Games",
    subcategory: "Arcade",
    rating: 0.0,
    ratingCount: 0,
    downloads: 0,
    size: "9.3 MB",
    version: "1.0",
    packageName: "com.blastgrid.game",
    icon: "uploads/icons/blastgrid.svg",
    banner: "uploads/screenshots/bg1.jpeg",
    description: "Action-packed brick busting puzzle game! Blast through colorful grids, unlock powerful multi-ball boosters, dynamic particle explosions, and high score challenges.",
    apkUrl: "uploads/apks/blastgrid.apk",
    badge: "Release Version",
    screenshots: [
      "uploads/screenshots/bg1.jpeg",
      "uploads/screenshots/bg2.jpeg",
      "uploads/screenshots/bg3.jpeg",
      "uploads/screenshots/bg4.jpeg"
    ],
    reviews: []
  }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadApps();
  setupEvents();
});

// Load Apps from API or LocalStorage fallback
async function loadApps(category = activeCategory, search = '') {
  try {
    let url = '/api/apps?';
    if (category && category !== 'All') url += `category=${encodeURIComponent(category)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('API unavailable');
    const data = await res.json();
    currentApps = data && data.length > 0 ? data : DEFAULT_APPS;
  } catch (err) {
    const localData = localStorage.getItem('appsphere_apps');
    if (localData && JSON.parse(localData).length > 0) {
      currentApps = JSON.parse(localData);
    } else {
      currentApps = DEFAULT_APPS;
      localStorage.setItem('appsphere_apps', JSON.stringify(DEFAULT_APPS));
    }

    if (category && category !== 'All') {
      currentApps = currentApps.filter(a =>
        (a.category && a.category.toLowerCase() === category.toLowerCase()) ||
        (a.subcategory && a.subcategory.toLowerCase() === category.toLowerCase())
      );
    }

    if (search) {
      const q = search.toLowerCase();
      currentApps = currentApps.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.developer.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }
  }

  renderPlayStore(currentApps);
}

// Render All Play Store Sections
function renderPlayStore(apps) {
  updateSpotlight(apps);
  renderTopCharts(apps);
  renderRecommended(apps);
  renderToolsSection(apps);
}

// 1. Featured Spotlight Billboard
function updateSpotlight(apps) {
  if (!apps || apps.length === 0) return;
  const featured = apps[0];

  document.getElementById('spotlightTitle').textContent = featured.title;
  document.getElementById('spotlightDev').textContent = featured.developer;
  document.getElementById('spotlightDesc').textContent = featured.description;
  document.getElementById('spotlightImg').src = featured.banner || (featured.screenshots && featured.screenshots[0]) || featured.icon;

  document.getElementById('spotlightInstallBtn').onclick = () => downloadApk(featured);
  document.getElementById('spotlightDetailsBtn').onclick = () => openAppDetail(featured.id);
}

// 2. Render Top Charts
function renderTopCharts(apps) {
  topChartsGrid.innerHTML = '';
  if (!apps || apps.length === 0) {
    topChartsGrid.innerHTML = `<p style="color: var(--gp-text-muted); font-size: 14px; grid-column: 1/-1;">No apps found matching criteria.</p>`;
    return;
  }

  apps.forEach((app, idx) => {
    const card = createAppCard(app, idx + 1);
    topChartsGrid.appendChild(card);
  });
}

// 3. Render Recommended
function renderRecommended(apps) {
  recommendedGrid.innerHTML = '';
  const games = apps.filter(a => (a.category && a.category.toLowerCase() === 'games') || a.id !== 'statussaver');
  const displayList = games.length > 0 ? games : apps;

  displayList.forEach(app => {
    const card = createAppCard(app);
    recommendedGrid.appendChild(card);
  });
}

// 4. Render Utilities & Tools
function renderToolsSection(apps) {
  toolsGrid.innerHTML = '';
  const tools = apps.filter(a => a.category && a.category.toLowerCase() === 'tools');
  const displayList = tools.length > 0 ? tools : apps;

  displayList.forEach(app => {
    const card = createAppCard(app);
    toolsGrid.appendChild(card);
  });
}

// Helper to create Google Play Style App Card
function createAppCard(app, rank = null) {
  const card = document.createElement('div');
  card.className = 'gp-app-card';
  card.setAttribute('data-id', app.id);

  const rankBadge = rank ? `<span class="gp-card-rank">#${rank}</span>` : '';
  const ratingDisplay = app.ratingCount && app.ratingCount > 0 ? `${app.rating.toFixed(1)} ★` : 'New';

  card.innerHTML = `
    <div class="gp-card-icon-wrap">
      ${rankBadge}
      <img src="${app.icon}" alt="${app.title}" class="gp-card-icon" onerror="this.src='https://api.iconify.design/material-symbols:android.svg?color=%2300f076'">
    </div>
    <div class="gp-card-body">
      <div class="gp-card-title">${app.title}</div>
      <div class="gp-card-dev">${app.developer}</div>
      <div class="gp-card-meta">
        <span class="gp-rating-pill"><span class="iconify" data-icon="material-symbols:star"></span> ${ratingDisplay}</span>
        <span class="gp-card-size">${app.size || '15 MB'}</span>
      </div>
    </div>
  `;

  card.addEventListener('click', () => openAppDetail(app.id));
  return card;
}

// Open App Detail View (Google Play Drawer)
async function openAppDetail(appId) {
  try {
    let app = currentApps.find(a => a.id === appId);
    if (!app) {
      const res = await fetch(`/api/apps/${appId}`);
      if (res.ok) app = await res.json();
    }
    if (!app) return;

    activeApp = app;

    document.getElementById('modalIcon').src = app.icon;
    document.getElementById('modalTitle').textContent = app.title;
    document.getElementById('modalDev').textContent = app.developer;
    document.getElementById('modalDevMeta').textContent = app.developer;
    document.getElementById('modalCategory').textContent = app.category || 'Arcade';

    const hasReviews = app.ratingCount && app.ratingCount > 0;
    const ratingVal = hasReviews ? app.rating.toFixed(1) : '0.0';
    document.getElementById('modalRating').innerHTML = hasReviews ? `${ratingVal} <span class="iconify" data-icon="material-symbols:star" style="color:#fbbc04;font-size:14px;"></span>` : 'New';
    document.getElementById('breakdownRatingNum').textContent = ratingVal;

    const revCount = hasReviews ? `${app.ratingCount} reviews` : '0 reviews';
    document.getElementById('modalReviewCount').textContent = revCount;
    document.getElementById('breakdownReviewsCount').textContent = hasReviews ? `${app.ratingCount} total ratings` : 'No reviews yet';

    document.getElementById('modalDownloads').textContent = formatDownloadsPlayStore(app.downloads);
    document.getElementById('modalSize').textContent = app.size || '15 MB';
    document.getElementById('modalVersion').textContent = `v${app.version || '1.0.0'}`;
    document.getElementById('modalPackageName').textContent = app.packageName || `com.play.${app.id}`;
    document.getElementById('modalDescription').textContent = app.description;

    const isGame = (app.category || '').toLowerCase() === 'games' || app.id === 'flapmaster' || app.id === 'blastgrid';
    document.getElementById('aboutHeading').textContent = isGame ? 'About this game' : 'About this app';

    // Update Rating Breakdown Progress Bars
    updateRatingBars(app.reviews || []);

    // Screenshots Gallery
    const track = document.getElementById('modalScreenshots');
    track.innerHTML = '';
    const screenshots = app.screenshots && app.screenshots.length > 0 ? app.screenshots : [app.banner || app.icon];
    screenshots.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `${app.title} screenshot`;
      track.appendChild(img);
    });

    // Install Button Handler
    const downloadBtn = document.getElementById('downloadApkBtn');
    downloadBtn.innerHTML = `<span class="iconify" data-icon="material-symbols:download"></span> Install`;
    downloadBtn.onclick = () => downloadApk(app);

    // Share & Bookmark Handlers
    document.getElementById('shareAppBtn').onclick = () => {
      const shareUrl = window.location.href;
      if (navigator.share) {
        navigator.share({ title: app.title, text: `Check out ${app.title} on AppSphere!`, url: shareUrl }).catch(() => {});
      } else {
        navigator.clipboard.writeText(shareUrl).then(() => showToast('Link copied to clipboard!'));
      }
    };

    document.getElementById('bookmarkAppBtn').onclick = () => {
      showToast(`Added ${app.title} to your Wishlist`);
    };

    renderReviews(app.reviews || []);
    detailModal.classList.add('active');
  } catch (err) {
    console.error('Error opening details:', err);
  }
}

// Calculate and render review progress bars
function updateRatingBars(reviews) {
  const barsContainer = document.querySelector('.gp-rating-bars-col');
  if (!barsContainer) return;

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const total = reviews.length;

  reviews.forEach(r => {
    const star = Math.round(r.rating || 5);
    if (counts[star] !== undefined) counts[star]++;
  });

  barsContainer.innerHTML = '';
  for (let star = 5; star >= 1; star--) {
    const pct = total > 0 ? Math.round((counts[star] / total) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'gp-bar-row';
    row.innerHTML = `
      <span>${star}</span>
      <div class="gp-bar-track">
        <div class="gp-bar-fill" style="width: ${pct}%;"></div>
      </div>
    `;
    barsContainer.appendChild(row);
  }
}

// Download APK / Install Simulation (Google Play Style with real increments)
async function downloadApk(app) {
  const downloadBtn = document.getElementById('downloadApkBtn');
  if (downloadBtn) {
    downloadBtn.innerHTML = `<span class="iconify" data-icon="material-symbols:progress-activity"></span> Installing...`;
  }

  showToast(`Downloading ${app.title}...`);

  app.downloads = (app.downloads || 0) + 1;
  document.getElementById('modalDownloads').textContent = formatDownloadsPlayStore(app.downloads);

  // Sync to API
  fetch(`/api/apps/${app.id}/download`, { method: 'POST' }).then(r => r.json()).then(data => {
    if (data.downloads) {
      app.downloads = data.downloads;
      document.getElementById('modalDownloads').textContent = formatDownloadsPlayStore(app.downloads);
    }
  }).catch(() => {});

  // Save to LocalStorage for GitHub Pages persistence
  const localApps = JSON.parse(localStorage.getItem('appsphere_apps') || '[]');
  const target = localApps.find(a => a.id === app.id);
  if (target) {
    target.downloads = app.downloads;
    localStorage.setItem('appsphere_apps', JSON.stringify(localApps));
  }

  // Trigger file download
  setTimeout(() => {
    if (downloadBtn) {
      downloadBtn.innerHTML = `<span class="iconify" data-icon="material-symbols:check-circle"></span> Installed`;
    }
    if (app.apkUrl) {
      const a = document.createElement('a');
      a.href = app.apkUrl;
      a.download = `${app.title.replace(/[^a-z0-9]/gi, '_')}.apk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, 1000);
}

// Render Reviews List
function renderReviews(reviews) {
  const container = document.getElementById('modalReviewsList');
  container.innerHTML = '';

  if (!reviews || reviews.length === 0) {
    container.innerHTML = `<p style="color: var(--gp-text-muted); font-size: 13px;">No user reviews yet. Rate this app below to be the first!</p>`;
    return;
  }

  reviews.forEach(r => {
    const card = document.createElement('div');
    card.className = 'gp-review-card';
    const initial = (r.user || 'U')[0].toUpperCase();
    card.innerHTML = `
      <div class="gp-review-author-row">
        <div class="gp-review-avatar">${initial}</div>
        <span class="gp-review-author-name">${r.user}</span>
      </div>
      <div class="gp-review-stars-date">
        <span class="stars">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</span>
        <span>·</span>
        <span>${r.date || 'Recent'}</span>
      </div>
      <p class="gp-review-text">${r.comment}</p>
    `;
    container.appendChild(card);
  });
}

// Setup Event Listeners
function setupEvents() {
  // Main Category Tabs
  document.querySelectorAll('.gp-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gp-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      loadApps(activeCategory, searchInput.value);
    });
  });

  // Device Pills
  document.querySelectorAll('.gp-device-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.gp-device-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeDevice = pill.dataset.device;
      showToast(`Switched view to ${pill.textContent.trim()}`);
    });
  });

  // Search
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    clearSearch.style.display = val ? 'block' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadApps(activeCategory, val);
    }, 250);
  });

  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    clearSearch.style.display = 'none';
    loadApps(activeCategory, '');
  });

  // Modals
  closeDetailBtn.addEventListener('click', () => detailModal.classList.remove('active'));
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) detailModal.classList.remove('active');
  });

  openUploadBtn.addEventListener('click', () => uploadModal.classList.add('active'));
  closeUploadBtn.addEventListener('click', () => uploadModal.classList.remove('active'));
  cancelUploadBtn.addEventListener('click', () => uploadModal.classList.remove('active'));
  uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) uploadModal.classList.remove('active');
  });

  // Review Stars Selection
  document.querySelectorAll('.gp-star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStarRating = parseInt(btn.dataset.val);
      document.querySelectorAll('.gp-star-btn').forEach(b => {
        const val = parseInt(b.dataset.val);
        if (val <= selectedStarRating) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    });
  });

  // Submit Review Form
  document.getElementById('submitReviewBtn').addEventListener('click', () => {
    if (!activeApp) return;
    const user = document.getElementById('reviewName').value || 'AppSphere User';
    const comment = document.getElementById('reviewComment').value || 'Great app!';

    const newRev = { user, rating: selectedStarRating, comment, date: new Date().toISOString().split('T')[0] };
    activeApp.reviews = activeApp.reviews || [];
    activeApp.reviews.unshift(newRev);

    // Recalculate real ratings
    const currentCount = activeApp.ratingCount || 0;
    const currentAvg = activeApp.rating || 0.0;
    if (currentCount === 0) {
      activeApp.rating = selectedStarRating;
      activeApp.ratingCount = 1;
    } else {
      activeApp.ratingCount = currentCount + 1;
      activeApp.rating = parseFloat(((currentAvg * currentCount + selectedStarRating) / activeApp.ratingCount).toFixed(1));
    }

    document.getElementById('modalRating').innerHTML = `${activeApp.rating.toFixed(1)} <span class="iconify" data-icon="material-symbols:star" style="color:#fbbc04;font-size:14px;"></span>`;
    document.getElementById('modalReviewCount').textContent = `${activeApp.ratingCount} reviews`;
    document.getElementById('breakdownRatingNum').textContent = activeApp.rating.toFixed(1);
    document.getElementById('breakdownReviewsCount').textContent = `${activeApp.ratingCount} total ratings`;

    updateRatingBars(activeApp.reviews);
    renderReviews(activeApp.reviews);
    document.getElementById('reviewComment').value = '';
    showToast('Review posted to AppSphere!');

    // Sync to API & LocalStorage
    fetch(`/api/apps/${activeApp.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, rating: selectedStarRating, comment })
    }).catch(() => {});

    const localApps = JSON.parse(localStorage.getItem('appsphere_apps') || '[]');
    const target = localApps.find(a => a.id === activeApp.id);
    if (target) {
      target.reviews = activeApp.reviews;
      target.rating = activeApp.rating;
      target.ratingCount = activeApp.ratingCount;
      localStorage.setItem('appsphere_apps', JSON.stringify(localApps));
    }
  });

  // Developer Console Upload Handler
  const upApkFile = document.getElementById('upApkFile');
  const apkFileName = document.getElementById('apkFileName');
  upApkFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      apkFileName.textContent = `Selected: ${e.target.files[0].name}`;
    }
  });

  const upScreenshotFiles = document.getElementById('upScreenshotFiles');
  const screenshotFilesLabel = document.getElementById('screenshotFilesLabel');
  const screenshotPreviews = document.getElementById('screenshotPreviews');

  upScreenshotFiles.addEventListener('change', async (e) => {
    selectedScreenshotFiles = Array.from(e.target.files);
    screenshotPreviews.innerHTML = '';
    if (selectedScreenshotFiles.length > 0) {
      screenshotFilesLabel.textContent = `${selectedScreenshotFiles.length} Screenshot(s) Selected`;
      screenshotPreviews.style.display = 'flex';
      for (const file of selectedScreenshotFiles) {
        const base64 = await readFileAsBase64(file);
        const img = document.createElement('img');
        img.src = base64;
        img.className = 'gp-preview-thumb';
        screenshotPreviews.appendChild(img);
      }
    }
  });

  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('upTitle').value;
    const developer = document.getElementById('upDeveloper').value || 'Aditya Kewat';
    const category = document.getElementById('upCategory').value;
    const version = document.getElementById('upVersion').value;
    const size = document.getElementById('upSize').value;
    const packageName = document.getElementById('upPackageName').value;
    const description = document.getElementById('upDescription').value;
    const iconUrl = document.getElementById('upIconUrl').value;
    const screenshotUrlsInput = document.getElementById('upScreenshotUrls').value;

    let apkBase64 = '';
    let apkFileName = '';
    if (upApkFile.files.length > 0) {
      const file = upApkFile.files[0];
      apkFileName = file.name;
      apkBase64 = await readFileAsBase64(file);
    }

    let iconBase64 = '';
    let iconFileName = '';
    const upIconFile = document.getElementById('upIconFile');
    if (upIconFile.files.length > 0) {
      const file = upIconFile.files[0];
      iconFileName = file.name;
      iconBase64 = await readFileAsBase64(file);
    }

    let screenshotsBase64 = [];
    if (selectedScreenshotFiles.length > 0) {
      for (const file of selectedScreenshotFiles) {
        const data = await readFileAsBase64(file);
        screenshotsBase64.push({ name: file.name, data });
      }
    }

    let screenshotUrls = [];
    if (screenshotUrlsInput && screenshotUrlsInput.trim()) {
      screenshotUrls = screenshotUrlsInput.split(',').map(u => u.trim()).filter(u => u !== '');
    }

    const payload = {
      title, developer, category, version, size, packageName, description,
      icon: iconUrl || undefined,
      apkBase64, apkFileName, iconBase64, iconFileName, screenshotsBase64, screenshotUrls
    };

    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        uploadModal.classList.remove('active');
        document.getElementById('uploadForm').reset();
        showToast(`🎉 "${title}" published to AppSphere!`);
        loadApps();
        return;
      }
    } catch (err) {
      console.warn('API unavailable, fallback to LocalStorage');
    }

    // Client-side LocalStorage fallback
    const localApps = JSON.parse(localStorage.getItem('appsphere_apps') || '[]');
    const newId = title.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36);
    const defaultIcon = iconBase64 || iconUrl || 'https://api.iconify.design/material-symbols:android.svg?color=%2300f076';
    const screenshotsList = screenshotsBase64.length ? screenshotsBase64.map(s => s.data) : (screenshotUrls.length ? screenshotUrls : [defaultIcon]);

    const newApp = {
      id: newId, title, developer, category,
      version: version || '1.0.0', size: size || '15 MB',
      packageName: packageName || `com.play.${newId}`,
      description, icon: defaultIcon, banner: screenshotsList[0] || defaultIcon,
      apkUrl: apkBase64 || '', badge: 'New', screenshots: screenshotsList,
      rating: 0.0, ratingCount: 0, downloads: 0, reviews: []
    };

    localApps.unshift(newApp);
    localStorage.setItem('appsphere_apps', JSON.stringify(localApps));
    uploadModal.classList.remove('active');
    document.getElementById('uploadForm').reset();
    showToast(`🎉 "${title}" published to AppSphere!`);
    loadApps();
  });
}

// Helpers
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

function formatDownloadsPlayStore(num) {
  if (!num || num === 0) return '0+';
  if (num >= 1000000) return (num / 1000000).toFixed(0) + 'M+';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K+';
  return num + '+';
}

function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
