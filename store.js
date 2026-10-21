import {initialState} from './core.js';

// Keep v1 database and existing keys intact. A separate revision key protects
// HTTP LAN tabs too, where Web Locks is unavailable. No data migration/reset.
const DB = 'life-restart-local';
let db;
let revision = 0;

export async function openStore() {
  db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('请关闭其他应用标签页后重试'));
  });
  db.onversionchange = () => db.close();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state');
    const store = tx.objectStore('state');
    const data = store.get('main');
    const version = store.get('revision');
    tx.oncomplete = () => {
      revision = version.result ?? 0;
      resolve(data.result ?? initialState());
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('读取中止'));
  });
}

export function persist(data, recovery) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    const store = tx.objectStore('state');
    let conflict = false;
    const current = store.get('revision');
    current.onsuccess = () => {
      if ((current.result ?? 0) !== revision) {
        conflict = true;
        tx.abort();
        return;
      }
      store.put(data, 'main');
      store.put(revision + 1, 'revision');
      if (recovery) store.put(recovery, 'recovery');
    };
    tx.oncomplete = () => { revision++; resolve(); };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => {
      const error = new Error(conflict
        ? '另一个页面已保存新记录。本次未保存，请复制未保存的文字，再刷新页面重试。'
        : '写入中止，请检查浏览器存储空间并重试。');
      error.name = conflict ? 'ConflictError' : 'StorageError';
      reject(error);
    };
  });
}

export function readRecovery() {
  return new Promise((resolve, reject) => {
    const request = db.transaction('state').objectStore('state').get('recovery');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
