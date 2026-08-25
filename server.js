const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'apps.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Helper to read apps JSON
function getApps() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading apps data:', err);
    return [];
  }
}

// Helper to save apps JSON
function saveApps(apps) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving apps data:', err);
  }
}

// MIME types lookup
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.apk': 'application/vnd.android.package-archive',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

// Create Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // GET /api/apps
  if (pathname === '/api/apps' && method === 'GET') {
    let apps = getApps();
    const category = parsedUrl.query.category;
    const search = parsedUrl.query.search;

    if (category && category !== 'All') {
      apps = apps.filter(a => 
        a.category.toLowerCase() === category.toLowerCase() ||
        (a.subcategory && a.subcategory.toLowerCase() === category.toLowerCase())
      );
    }

    if (search) {
      const q = search.toLowerCase();
      apps = apps.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.developer.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(apps));
  }

  // GET /api/apps/:id
  if (pathname.startsWith('/api/apps/') && method === 'GET') {
    const id = pathname.replace('/api/apps/', '').split('/')[0];
    const apps = getApps();
    const app = apps.find(a => a.id === id);

    if (!app) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'App not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(app));
  }

  // POST /api/apps (Publish New App)
  if (pathname === '/api/apps' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const apps = getApps();

        const newId = payload.title.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36);
        let apkPath = payload.apkUrl || '';
        let iconPath = payload.icon || 'https://api.iconify.design/material-symbols:android.svg?color=%2300f2fe';

        if (payload.apkBase64 && payload.apkFileName) {
          const apkBuffer = Buffer.from(payload.apkBase64.split(',')[1] || payload.apkBase64, 'base64');
          const cleanFileName = payload.apkFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fullApkPath = path.join(UPLOADS_DIR, 'apks', cleanFileName);
          fs.mkdirSync(path.join(UPLOADS_DIR, 'apks'), { recursive: true });
          fs.writeFileSync(fullApkPath, apkBuffer);
          apkPath = `/uploads/apks/${cleanFileName}`;
        }

        if (payload.iconBase64 && payload.iconFileName) {
          const iconBuffer = Buffer.from(payload.iconBase64.split(',')[1] || payload.iconBase64, 'base64');
          const cleanIconName = payload.iconFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fullIconPath = path.join(UPLOADS_DIR, 'icons', cleanIconName);
          fs.mkdirSync(path.join(UPLOADS_DIR, 'icons'), { recursive: true });
          fs.writeFileSync(fullIconPath, iconBuffer);
          iconPath = `/uploads/icons/${cleanIconName}`;
        }

        let screenshotPaths = [];
        if (payload.screenshotsBase64 && Array.isArray(payload.screenshotsBase64)) {
          fs.mkdirSync(path.join(UPLOADS_DIR, 'screenshots'), { recursive: true });
          payload.screenshotsBase64.forEach((sc, idx) => {
            try {
              const buffer = Buffer.from(sc.data.split(',')[1] || sc.data, 'base64');
              const cleanName = `${newId}_ss_${idx}_${sc.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
              const fullPath = path.join(UPLOADS_DIR, 'screenshots', cleanName);
              fs.writeFileSync(fullPath, buffer);
              screenshotPaths.push(`/uploads/screenshots/${cleanName}`);
            } catch (e) {
              console.error('Error saving screenshot file:', e);
            }
          });
        }

        if (payload.screenshotUrls && Array.isArray(payload.screenshotUrls)) {
          payload.screenshotUrls.forEach(u => {
            if (u && u.trim()) screenshotPaths.push(u.trim());
          });
        }

        if (screenshotPaths.length === 0) {
          screenshotPaths.push(iconPath);
        }

        const newApp = {
          id: newId,
          title: payload.title || 'Untitled App',
          developer: payload.developer || 'Aditya Kewat',
          category: payload.category || 'Tools',
          subcategory: payload.subcategory || 'General',
          rating: 0.0,
          ratingCount: 0,
          downloads: 0,
          size: payload.size || '15 MB',
          version: payload.version || '1.0.0',
          packageName: payload.packageName || `com.dev.${newId}`,
          icon: iconPath,
          banner: screenshotPaths[0] || iconPath,
          description: payload.description || 'No description provided.',
          apkUrl: apkPath,
          playUrl: payload.playUrl || '',
          badge: 'Release Version',
          screenshots: screenshotPaths,
          reviews: []
        };

        apps.unshift(newApp);
        saveApps(apps);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, app: newApp }));
      } catch (err) {
        console.error('Error creating app:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }

  // POST /api/apps/:id/download (Increment Downloads)
  if (pathname.match(/^\/api\/apps\/[^\/]+\/download$/) && method === 'POST') {
    const id = pathname.split('/')[3];
    const apps = getApps();
    const app = apps.find(a => a.id === id);

    if (!app) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'App not found' }));
    }

    app.downloads = (app.downloads || 0) + 1;
    saveApps(apps);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, downloads: app.downloads, apkUrl: app.apkUrl }));
  }

  // POST /api/apps/:id/review (Submit Review)
  if (pathname.match(/^\/api\/apps\/[^\/]+\/review$/) && method === 'POST') {
    const id = pathname.split('/')[3];
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const apps = getApps();
        const app = apps.find(a => a.id === id);

        if (!app) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'App not found' }));
        }

        const newRating = parseFloat(payload.rating) || 5;
        const currentCount = app.ratingCount || 0;
        const currentAvg = app.rating || 0.0;

        app.reviews = app.reviews || [];
        app.reviews.unshift({
          user: payload.user || 'AppSphere User',
          rating: newRating,
          date: new Date().toISOString().split('T')[0],
          comment: payload.comment || 'Great app!'
        });

        if (currentCount === 0) {
          app.rating = newRating;
          app.ratingCount = 1;
        } else {
          app.ratingCount = currentCount + 1;
          app.rating = parseFloat(((currentAvg * currentCount + newRating) / app.ratingCount).toFixed(1));
        }
        saveApps(apps);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, app }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }

  // STATIC FILES ROUTING
  let filePath = '';
  if (pathname.startsWith('/uploads/')) {
    filePath = path.join(__dirname, pathname);
  } else if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else {
    filePath = path.join(PUBLIC_DIR, pathname);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if (pathname.startsWith('/flappy-neon')) {
        const neonFile = path.join(PUBLIC_DIR, pathname);
        if (fs.existsSync(neonFile) && fs.statSync(neonFile).isFile()) {
          return serveFile(neonFile, res);
        } else {
          return serveFile(path.join(PUBLIC_DIR, 'flappy-neon', 'index.html'), res);
        }
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Internal Server Error');
    }
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Content-Length': data.length
    });
    res.end(data);
  });
}

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 AppSphere Market live at: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
