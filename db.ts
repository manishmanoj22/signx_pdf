
import { DocumentRecord, UserSignature } from './types';

const DB_NAME = 'SignEaseDB';
const DB_VERSION = 1;
const STORES = {
  DOCUMENTS: 'documents',
  SIGNATURES: 'signatures'
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SIGNATURES)) {
        db.createObjectStore(STORES.SIGNATURES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllDocs = async (): Promise<DocumentRecord[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DOCUMENTS, 'readonly');
    const store = transaction.objectStore(STORES.DOCUMENTS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.id.localeCompare(a.id)));
    request.onerror = () => reject(request.error);
  });
};

export const saveDoc = async (doc: DocumentRecord): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DOCUMENTS, 'readwrite');
    const store = transaction.objectStore(STORES.DOCUMENTS);
    const request = store.put(doc);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteDoc = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DOCUMENTS, 'readwrite');
    const store = transaction.objectStore(STORES.DOCUMENTS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllSigs = async (): Promise<UserSignature[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SIGNATURES, 'readonly');
    const store = transaction.objectStore(STORES.SIGNATURES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveSig = async (sig: UserSignature): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SIGNATURES, 'readwrite');
    const store = transaction.objectStore(STORES.SIGNATURES);
    const request = store.put(sig);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
