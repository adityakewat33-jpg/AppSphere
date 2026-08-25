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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadApps();
  setupEvents();
});

// Fetch apps from API
async function loadApps(category = activeCategory, search = '') {
  try {
    let url = '/api/apps?';
    if (category && category !== 'All') url += `category=${encodeURIComponent(category)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await fetch(url);
    const data = await res.json();
    currentApps = data;
    renderApps(currentApps);
    updateHeroBanner(currentApps);
  } catch (err) {
    console.error('Error fetching apps:', err);
  }
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
        <span class="rating-badge">★ ${(app.rating || 5.0).toFixed(1)}</span>
        <span class="download-text">${formatDownloads(app.downloads)} downloads</span>
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
    const res = await fetch(`/api/apps/${appId}`);
    const app = await res.json();
    activeApp = app;

    document.getElementById('modalIcon').src = app.icon;
    document.getElementById('modalTitle').textContent = app.title;
    document.getElementById('modalDev').textContent = app.developer;
    document.getElementById('modalCategory').textContent = app.category;
    document.getElementById('modalVersion').textContent = `v${app.version}`;
    document.getElementById('modalBadge').textContent = app.badge || 'Verified';

    document.getElementById('modalRating').textContent = `${(app.rating || 5.0).toFixed(1)} ★`;
    document.getElementById('modalReviewCount').textContent = `${app.ratingCount || 1} Reviews`;
    document.getElementById('modalDownloads').textContent = `${formatDownloads(app.downloads)}+`;
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

// Download APK Handler
async function downloadApk(app) {
  try {
    const res = await fetch(`/api/apps/${app.id}/download`, { method: 'POST' });
    const data = await res.json();
    
    if (data.downloads) {
      app.downloads = data.downloads;
      document.getElementById('modalDownloads').textContent = `${formatDownloads(app.downloads)}+`;
      showToast(`Downloading ${app.title} APK package...`);
    }

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
    reviewsContainer.innerHTML = `<p style="color: var(--text-secondary); font-size: 13px;">No reviews yet. Be the first to leave a review!</p>`;
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

  // Multiple Screenshots file change & live preview
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

    try {
      const res = await fetch(`/api/apps/${activeApp.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, rating: selectedStarRating, comment })
      });
      const data = await res.json();

      if (data.app) {
        activeApp = data.app;
        document.getElementById('modalRating').textContent = `${activeApp.rating.toFixed(1)} ★`;
        document.getElementById('modalReviewCount').textContent = `${activeApp.ratingCount} Reviews`;
        renderReviews(activeApp.reviews);
        document.getElementById('reviewComment').value = '';
        showToast('Review submitted successfully!');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  });

  // Upload Form Submit Handler (Publish App with Screenshots)
  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('upTitle').value;
    const developer = document.getElementById('upDeveloper').value;
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

    // Process screenshots Base64 files
    let screenshotsBase64 = [];
    if (selectedScreenshotFiles.length > 0) {
      for (const file of selectedScreenshotFiles) {
        const data = await readFileAsBase64(file);
        screenshotsBase64.push({ name: file.name, data });
      }
    }

    // Process screenshot URLs
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
      const data = await res.json();

      if (data.success) {
        uploadModal.classList.remove('active');
        document.getElementById('uploadForm').reset();
        document.getElementById('apkFileName').textContent = 'Click or drag & drop `.apk` file here';
        screenshotFilesLabel.textContent = 'Click or drag & drop screenshot images here (multiple allowed)';
        screenshotPreviews.style.display = 'none';
        selectedScreenshotFiles = [];
        showToast(`🎉 "${title}" published to AppSphere!`);
        loadApps();
      }
    } catch (err) {
      console.error('Publish error:', err);
      showToast('Failed to publish app. Please try again.');
    }
  });
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
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
