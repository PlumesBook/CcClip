/* 上传资源本地缓存（IndexedDB） */

export interface UploadStoreSaveParams {
  activeKey: string;
  groupType: string;
  groupTitle: string;
  name: string;
  format: string;
  cover: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  time: number;
  file: File;
  sourceFrame?: number;
}

export interface UploadStoreRecord {
  id: string;
  activeKey: string;
  groupType: string;
  groupTitle: string;
  name: string;
  format: string;
  cover: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  time: number;
  sourceFrame?: number;
  createdAt: number;
  file: Blob;
}

const DB_NAME = 'CcClipUploadDB';
const DB_VERSION = 1;
const STORE_NAME = 'uploads';
const INDEX_ACTIVE_KEY = 'by_activeKey';

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex(INDEX_ACTIVE_KEY, 'activeKey', { unique: false });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveUploadResource(params: UploadStoreSaveParams): Promise<{ id: string }> {
  const db = await openDB();
  if (!db) {
    return { id: '' };
  }
  const id = `${params.activeKey || 'default'}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const record: UploadStoreRecord = {
    id,
    activeKey: params.activeKey,
    groupType: params.groupType,
    groupTitle: params.groupTitle,
    name: params.name,
    format: params.format,
    cover: params.cover,
    width: params.width,
    height: params.height,
    fps: params.fps,
    frameCount: params.frameCount,
    time: params.time,
    sourceFrame: params.sourceFrame,
    createdAt: Date.now(),
    file: params.file
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
  db.close();
  return { id };
}

export async function getUploadResources(activeKey: string): Promise<UploadStoreRecord[]> {
  const db = await openDB();
  if (!db) {
    return [];
  }
  return new Promise<UploadStoreRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    let request: IDBRequest;
    if (store.indexNames.contains(INDEX_ACTIVE_KEY)) {
      const index = store.index(INDEX_ACTIVE_KEY);
      const range = IDBKeyRange.only(activeKey);
      request = index.getAll(range);
    } else {
      request = store.getAll();
    }
    request.onsuccess = () => {
      const all = (request.result || []) as UploadStoreRecord[];
      const filtered = all.filter(record => record.activeKey === activeKey);
      resolve(filtered);
    };
    request.onerror = () => {
      reject(request.error);
    };
    tx.oncomplete = () => {
      db.close();
    };
    tx.onabort = () => {
      db.close();
    };
  });
}

export async function deleteUploadResource(id: string): Promise<void> {
  const db = await openDB();
  if (!db) {
    return;
  }
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
    tx.oncomplete = () => {
      db.close();
    };
  });
}
