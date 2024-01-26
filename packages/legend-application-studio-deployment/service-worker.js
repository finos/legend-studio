function handleInstall() {
  console.log('installing');
  self.skipWaiting();
}

function handleDownloadFetch() {
  console.log('handleDownloadFetch');
}

function handleDownloadMessage() {
  console.log('handleDownloadFetch');
}

function handleActivate(event) {
  event.waitUntil(self.clients.claim());
}

function handleMessage(event) {
  handleDownloadMessage(event);
}

function handleFetch(event) {
  handleDownloadFetch(event);
}

self.addEventListener('install', handleInstall);

self.addEventListener('activate', handleActivate);
self.addEventListener('message', handleMessage);
self.addEventListener('fetch', handleFetch);
