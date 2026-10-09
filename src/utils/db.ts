/** 极简 IndexedDB 封装（不可用时回退到 localStorage） */
const DB_NAME = 'mamababa-rhythm'
const STORE = 'records'
const FALLBACK_KEY = 'mmb-records-fallback'

let dbPromise: Promise<IDBDatabase | null> | null = null

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      if (!('indexedDB' in window)) return resolve(null)
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

function readFallback<T>(): T[] {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]')
  } catch {
    return []
  }
}

export async function dbGetAll<T>(): Promise<T[]> {
  const db = await open()
  if (!db) return readFallback<T>()
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => resolve(readFallback<T>())
  })
}

export async function dbPut<T extends { id: string }>(value: T): Promise<void> {
  const db = await open()
  if (!db) {
    const all = readFallback<T>().filter((v) => v.id !== value.id)
    all.push(value)
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(all))
    return
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

export async function dbClear(): Promise<void> {
  localStorage.removeItem(FALLBACK_KEY)
  const db = await open()
  if (!db) return
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}
