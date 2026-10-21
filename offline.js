let registration;
let status = '正在检查离线资源…';
function show(text) {
  status = text;
  document.querySelectorAll('[data-offline-status]').forEach(el => el.textContent = text);
}
async function check() {
  if (!isSecureContext || !('serviceWorker' in navigator)) {
    show('此地址不能离线安装。iPhone 请使用正式发布的 GitHub Pages HTTPS 地址。');
    return;
  }
  const worker = navigator.serviceWorker.controller;
  if (!worker) { show('尚未完成离线安装，请保持安装站点可连接，稍后再次检查。'); return; }
  try {
    const result = await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(Error()); }, 5000);
      channel.port1.onmessage = e => { clearTimeout(timer); channel.port1.close(); resolve(e.data); };
      worker.postMessage({type:'STATUS'}, [channel.port2]);
    });
    show(result.ready
      ? `离线资源已就绪 · ${result.version} · ${result.count}/${result.total}。请从主屏幕打开后再次检查，并关闭 Mac 实测。`
      : `离线资源不完整（${result.count}/${result.total}）。请连接安装站点，在下面检查更新；必要时关闭全部应用窗口后重新打开。`);
  } catch { show('暂时无法确认缓存，请保持安装站点可连接并重新打开应用检查。'); }
}
export function offlineCard() {
  return `<div class="card wide"><h2>离线使用与本机存储</h2><p data-offline-status role="status"></p><div class="actions"><button type="button" data-offline-check>检查离线资源</button><button type="button" data-offline-update>检查更新</button><button type="button" data-storage-persist>请求持久保存</button></div><p data-storage-status class="note"></p><p class="note">GitHub Pages 版本首次安装和更新需要联网；本地版需要连接安装服务器；完整缓存后，日常记录、照片和备份可离线使用。更新下载完毕后，请关闭所有本应用窗口再打开。持久保存是否获准由系统决定，不等同于永久备份。</p><p class="note">卸载主屏幕 App、清理网站数据、设备故障或系统回收空间可能使记录和缓存丢失。请定期导出包含照片的 JSON，存入「文件」或另存一份到电脑。</p></div>`;
}
async function storageStatus() {
  const el = document.querySelector('[data-storage-status]');
  if (!el) return;
  try {
    const persisted = await navigator.storage?.persisted?.();
    el.textContent = persisted ? '系统已授予持久存储；仍需定期导出备份。' : '未获持久存储或浏览器不支持。请定期导出备份。';
  } catch { el.textContent = '无法查询存储权限；本地保存仍可使用，请备份。'; }
}
export function bindOffline() {
  show(status); storageStatus();
  const bind = (selector, fn) => { const el=document.querySelector(selector); if(el)el.onclick=fn; };
  bind('[data-offline-check]', check);
  bind('[data-storage-persist]', async () => {
    try { await navigator.storage?.persist?.(); } catch { /* browser decides */ }
    await storageStatus();
  });
  bind('[data-offline-update]', async () => {
    if (!registration) return check();
    try {
      // A normal update preserves the active version while a new one installs.
      await registration.update();
      await check();
      if (registration.waiting) show('新版本已下载。保存完成后，关闭所有本应用窗口，再重新打开。');
      else show(status + ' 若缓存不完整，请保持安装站点可连接，并联系维护者重新发布缓存版本；勿清理网站数据。');
    } catch { show('无法连接安装服务器。已有完整缓存仍可离线使用；联网后再检查更新。'); }
  });
}
export async function startOffline() {
  if (!isSecureContext || !('serviceWorker' in navigator)) return check();
  navigator.serviceWorker.addEventListener('controllerchange', check);
  await check();
  try {
    registration = await navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'});
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed' && registration.waiting)
          show('更新已缓存；保存后关闭全部应用窗口，再打开以使用新版本。');
        if (installing.state === 'redundant') show('本次离线资源安装失败，请连接安装站点 重试。已有记录未改变。');
      });
    });
    await check();
  } catch { if (!navigator.serviceWorker.controller) show('离线安装失败，请确认正在使用 HTTPS 地址并联网重试。'); }
}
