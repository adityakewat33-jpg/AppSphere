let currentApps = [];
let activeCategory = 'All';
let activeApp = null;
let selectedStarRating = 5;
let selectedScreenshotFiles = [];

// DOM Elements
const appsGrid = document.getElementById('appsGrid');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const sectionTitle = document.getElementById('sectionTitle');
const appCount = document.getElementById('appCount');
const toast = document.getElementById('toast');

// Modals
const detailModal = document.getElementById('detailModal');
const closeDetailBtn = document.getElementById('closeDetailBtn');
const uploadModal = document.getElementById('uploadModal');
const openUploadBtn = document.getElementById('openUploadBtn');
const heroUploadBtn = document.getElementById('heroUploadBtn');
const closeUploadBtn = document.getElementById('closeUploadBtn');
const cancelUploadBtn = document.getElementById('cancelUploadBtn');

// Default Release Apps (Zero fake downloads & zero fake reviews)
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
    size: "22.1 MB",
    version: "1.4.2",
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
    size: "16.2 MB",
    version: "1.0.0",
    packageName: "com.adityakewat.blastgrid",
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

// Fetch apps from API (with LocalStorage / Default fallback for GitHub Pages)
async function loadApps(category = activeCategory, search = '') {
  try {
    let url = '/api/apps?';
    if (category && category !== 'All') url += `category=${encodeURIComponent(category)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('API unavailable');
    const data = await res.json();
    currentApps = data;
  } catch (err) {
    const localData = localStorage.getItem('appsphere_apps');
    if (localData && JSON.parse(localData).length > 0) {
      currentApps = JSON.parse(localData);
    } else {
      currentApps = DEFAULT_APPS;
      localStorage.setItem('appsphere_apps', JSON.stringify(DEFAULT_APPS));
    }

    if (category && category !== 'All') {
      currentApps = currentApps.filter(a => a.category.toLowerCase() === category.toLowerCase());
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

  renderApps(currentApps);
  updateHeroBanner(currentApps);
}

// Render App Cards
function renderApps(apps) {
  appsGrid.innerHTML = '';
  appCount.textContent = `${apps.length} App${apps.length === 1 ? '' : 's'} Available`;

  if (apps.length === 0) {
    appsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed var(--border-color);">
        <span class="iconify" data-icon="material-symbols:cloud-upload-outline" style="font-size: 56px; color: var(--accent-cyan); margin-bottom: 14px; display: block; margin-left: auto; margin-right: auto;"></span>
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">No Apps Uploaded Yet</h3>
        <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 20px;">Be the first to publish an app on AppSphere!</p>
        <button class="btn-publish" onclick="document.getElementById('uploadModal').classList.add('active')" style="margin: 0 auto;">
          <span class="iconify" data-icon="material-symbols:add-circle"></span> Upload App Now
        </button>
      </div>
    `;
    return;
  }

  apps.forEach(app => {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.setAttribute('data-id', app.id);
    card.innerHTML = `
      <div>
        <div class="card-top">
          <img src="${app.icon}" alt="${app.title}" class="app-icon" onerror="this.src='https://api.iconify.design/material-symbols:android.svg?color=%2300f2fe'">
          <div class="app-info">
            <h3>${app.title}</h3>
            <p class="dev-text">${app.developer}</p>
            <span class="badge-pill">${app.badge || app.category}</span>
          </div>
        </div>
        <p class="card-desc">${app.description}</p>
      </div>

      <div class="card-bottom">
        <span class="rating-badge">${app.ratingCount > 0 ? `★ ${app.rating.toFixed(1)}` : 'New'}</span>
        <span class="download-text card-downloads">${formatDownloads(app.downloads)}</span>
      </div>
    `;

    card.addEventListener('click', () => openAppDetail(app.id));
    appsGrid.appendChild(card);
  });
}

// Update Hero Banner
function updateHeroBanner(apps) {
  const heroTitle = document.getElementById('heroTitle');
  const heroDesc = document.getElementById('heroDesc');
  const heroActions = document.querySelector('.hero-actions');
  const heroImage = document.querySelector('.hero-image');

  if (apps.length === 0) {
    heroTitle.textContent = 'Your Personal App Marketplace';
    heroDesc.textContent = 'AppSphere is live and ready. Publish your Android APKs and Web Games one by one using the Developer Studio!';
    heroActions.innerHTML = `
      <button class="btn-primary" id="heroUploadBtn">
        <span class="iconify" data-icon="material-symbols:add-circle"></span> Upload Your First App
      </button>
    `;
    document.getElementById('heroUploadBtn').onclick = () => uploadModal.classList.add('active');

    heroImage.innerHTML = `
      <div class="hero-empty-illustration">
        <span class="iconify" data-icon="material-symbols:folder-zip-rounded"></span>
        <p>Ready for your APKs</p>
      </div>
    `;
  } else {
    const featured = apps[0];
    heroTitle.textContent = featured.title;
    heroDesc.textContent = featured.description;
    heroActions.innerHTML = `
      <button class="btn-primary" id="heroDownloadBtn">
        <span class="iconify" data-icon="material-symbols:download"></span> Install APK Package
      </button>
      <button class="btn-secondary" id="heroDetailsBtn" style="background: rgba(255,255,255,0.08); color: white; border: 1px solid var(--border-color); padding: 12px 24px; border-radius: 24px; font-weight: 700; cursor: pointer;">
        <span class="iconify" data-icon="material-symbols:info"></span> View Details
      </button>
    `;

    document.getElementById('heroDownloadBtn').onclick = () => downloadApk(featured);
    document.getElementById('heroDetailsBtn').onclick = () => openAppDetail(featured.id);

    heroImage.innerHTML = `
      <img src="${featured.banner || featured.screenshots[0] || featured.icon}" alt="${featured.title}" style="width: 360px; height: 200px; object-fit: cover; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
    `;
  }
}

// Open App Details Modal
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
    document.getElementById('modalCategory').textContent = app.category;
    document.getElementById('modalVersion').textContent = `v${app.version}`;
    document.getElementById('modalBadge').textContent = app.badge || 'Verified';

    document.getElementById('modalRating').textContent = app.ratingCount > 0 ? `${app.rating.toFixed(1)} ★` : 'New';
    document.getElementById('modalReviewCount').textContent = `${app.ratingCount || 0} Reviews`;
    document.getElementById('modalDownloads').textContent = formatDownloads(app.downloads);
    document.getElementById('modalSize').textContent = app.size || '15 MB';

    document.getElementById('modalDescription').textContent = app.description;
    document.getElementById('modalPackageName').textContent = app.packageName || `com.app.${app.id}`;

    // Screenshots Showcase
    const screenshotsContainer = document.getElementById('modalScreenshots');
    screenshotsContainer.innerHTML = '';
    const screenshots = app.screenshots && app.screenshots.length ? app.screenshots : [app.banner || app.icon];
    screenshots.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Screenshot';
      screenshotsContainer.appendChild(img);
    });

    const playWebBtn = document.getElementById('playWebBtn');
    const downloadApkBtn = document.getElementById('downloadApkBtn');

    if (app.playUrl) {
      playWebBtn.style.display = 'flex';
      playWebBtn.href = app.playUrl;
    } else {
      playWebBtn.style.display = 'none';
    }

    downloadApkBtn.onclick = () => downloadApk(app);

    renderReviews(app.reviews || []);
    detailModal.classList.add('active');
  } catch (err) {
    console.error('Error loading app details:', err);
  }
}

// Real-Time Download APK Handler
async function downloadApk(app) {
  try {
    app.downloads = (app.downloads || 0) + 1;
    
    // Update live modal stat
    document.getElementById('modalDownloads').textContent = formatDownloads(app.downloads);
    
    // Update live grid card stat
    const cardEl = document.querySelector(`.app-card[data-id="${app.id}"] .card-downloads`);
    if (cardEl) {
      cardEl.textContent = formatDownloads(app.downloads);
    }

    showToast(`Downloading ${app.title} APK package...`);

    // POST to backend API for live count increment
    fetch(`/api/apps/${app.id}/download`, { method: 'POST' }).then(r => r.json()).then(data => {
      if (data.downloads) {
        app.downloads = data.downloads;
        document.getElementById('modalDownloads').textContent = formatDownloads(app.downloads);
        if (cardEl) cardEl.textContent = formatDownloads(app.downloads);
      }
    }).catch(() => {});

    // Save to localStorage for GitHub Pages static mode persistence
    const localApps = JSON.parse(localStorage.getItem('appsphere_apps') || '[]');
    const target = localApps.find(a => a.id === app.id);
    if (target) {
      target.downloads = app.downloads;
      localStorage.setItem('appsphere_apps', JSON.stringify(localApps));
    }

    // Trigger file download
    if (app.apkUrl) {
      const a = document.createElement('a');
      a.href = app.apkUrl;
      a.download = `${app.title.replace(/[^a-z0-9]/gi, '_')}.apk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      showToast(`No APK file attached yet for ${app.title}`);
    }
  } catch (err) {
    console.error('Download error:', err);
  }
}

// Render Reviews List
function renderReviews(reviews) {
  const reviewsContainer = document.getElementById('modalReviewsList');
  reviewsContainer.innerHTML = '';

  if (reviews.length === 0) {
    reviewsContainer.innerHTML = `<p style="color: var(--text-secondary); font-size: 13px;">No user reviews yet. Be the first to leave a review!</p>`;
    return;
  }

  reviews.forEach(r => {
    const item = document.createElement('div');
    item.className = 'review-item';
    item.innerHTML = `
      <div class="review-top">
        <span class="review-user">${r.user}</span>
        <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
      </div>
      <p class="review-comment">${r.comment}</p>
    `;
    reviewsContainer.appendChild(item);
  });
}

// Setup Event Listeners
function setupEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      sectionTitle.textContent = activeCategory === 'All' ? 'All Published Apps' : `${activeCategory} Category`;
      loadApps(activeCategory, searchInput.value);
    });
  });

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.dataset.filter;
      loadApps(activeCategory, searchInput.value);
    });
  });

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
      screenshotFilesLabel.textContent = `${selectedScreenshotFiles.length} Screenshot Image(s) Selected`;
      screenshotPreviews.style.display = 'flex';

      for (const file of selectedScreenshotFiles) {
        const base64 = await readFileAsBase64(file);
        const img = document.createElement('img');
        img.src = base64;
        img.className = 'screenshot-preview-thumb';
        screenshotPreviews.appendChild(img);
      }
    } else {
      screenshotFilesLabel.textContent = 'Click or drag & drop screenshot images here (multiple allowed)';
      screenshotPreviews.style.display = 'none';
    }
  });

  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStarRating = parseInt(btn.dataset.val);
      document.querySelectorAll('.star-btn').forEach(b => {
        const val = parseInt(b.dataset.val);
        if (val <= selectedStarRating) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    });
  });

  document.getElementById('submitReviewBtn').addEventListener('click', async () => {
    if (!activeApp) return;

    const user = document.getElementById('reviewName').value || 'AppSphere User';
    const comment = document.getElementById('reviewComment').value || 'Great app!';

    const newReview = { user, rating: selectedStarRating, comment, date: new Date().toISOString().split('T')[0] };
    activeApp.reviews = activeApp.reviews || [];
    activeApp.reviews.unshift(newReview);
    
    if (activeApp.ratingCount === 0) {
      activeApp.rating = selectedStarRating;
      activeApp.ratingCount = 1;
    } else {
      const currentAvg = activeApp.rating || 0;
      const count = activeApp.ratingCount || 1;
      activeApp.ratingCount = count + 1;
      activeApp.rating = parseFloat(((currentAvg * count + selectedStarRating) / activeApp.ratingCount).toFixed(1));
    }

    document.getElementById('modalRating').textContent = `${activeApp.rating.toFixed(1)} ★`;
    document.getElementById('modalReviewCount').textContent = `${activeApp.ratingCount} Reviews`;
    renderReviews(activeApp.reviews);
    document.getElementById('reviewComment').value = '';
    showToast('Review submitted successfully!');

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

    const apkFileInput = document.getElementById('upApkFile');
    const iconFileInput = document.getElementById('upIconFile');

    let apkBase64 = '';
    let apkFileName = '';
    if (apkFileInput.files.length > 0) {
      const file = apkFileInput.files[0];
      apkFileName = file.name;
      apkBase64 = await readFileAsBase64(file);
    }

    let iconBase64 = '';
    let iconFileName = '';
    if (iconFileInput.files.length > 0) {
      const file = iconFileInput.files[0];
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
      title,
      developer,
      category,
      version,
      size,
      packageName,
      description,
      icon: iconUrl || undefined,
      apkBase64,
      apkFileName,
      iconBase64,
      iconFileName,
      screenshotsBase64,
      screenshotUrls
    };

    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          resetFormAndClose(title);
          loadApps();
          return;
        }
      }
    } catch (err) {
      console.warn('API unavailable, falling back to LocalStorage mode');
    }

    const localApps = JSON.parse(localStorage.getItem('appsphere_apps') || '[]');
    const newId = title.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36);
    const defaultIcon = iconBase64 || iconUrl || 'https://api.iconify.design/material-symbols:android.svg?color=%2300f2fe';
    const screenshotsList = screenshotsBase64.length ? screenshotsBase64.map(s => s.data) : (screenshotUrls.length ? screenshotUrls : [defaultIcon]);

    const newApp = {
      id: newId,
      title,
      developer,
      category,
      version: version || '1.0.0',
      size: size || '15 MB',
      packageName: packageName || `com.dev.${newId}`,
      description,
      icon: defaultIcon,
      banner: screenshotsList[0] || defaultIcon,
      apkUrl: apkBase64 || '',
      badge: 'Release Version',
      screenshots: screenshotsList,
      rating: 0.0,
      ratingCount: 0,
      downloads: 0,
      reviews: []
    };

    localApps.unshift(newApp);
    localStorage.setItem('appsphere_apps', JSON.stringify(localApps));
    resetFormAndClose(title);
    loadApps();
  });
}

function resetFormAndClose(title) {
  uploadModal.classList.remove('active');
  document.getElementById('uploadForm').reset();
  document.getElementById('apkFileName').textContent = 'Click or drag & drop `.apk` file here';
  document.getElementById('screenshotFilesLabel').textContent = 'Click or drag & drop screenshot images here (multiple allowed)';
  document.getElementById('screenshotPreviews').style.display = 'none';
  selectedScreenshotFiles = [];
  showToast(`🎉 "${title}" published to AppSphere!`);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

function formatDownloads(num) {
  if (!num || num === 0) return '0 downloads';
  if (num === 1) return '1 download';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M downloads';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K downloads';
  return `${num} downloads`;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
