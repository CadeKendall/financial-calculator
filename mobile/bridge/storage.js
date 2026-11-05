export const STORAGE_KEYS = ['ba-ii-plus-preview-v1', 'ba-ii-plus-preview-v1-ui', 'ba-ii-plus-preview-v1-expression', 'ba-ii-plus-preview-v1-history', 'ba-ii-plus-preview-v1-haptics'];
export function cleanStorage(value) {
  /** @type {Record<string, string>} */
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const key of STORAGE_KEYS) if (typeof value[key] === 'string' && value[key].length <= 4000000) result[key] = value[key];
  return result;
}
export function createNativeStorage(seed, send) {
  const data = new Map(Object.entries(cleanStorage(seed)));
  return {
    get length() { return data.size; },
    key(index) { return [...data.keys()][index] ?? null; },
    getItem(key) { return data.get(String(key)) ?? null; },
    setItem(key, value) {
      key = String(key); value = String(value);
      if (!STORAGE_KEYS.includes(key)) throw new Error('Unknown calculator storage key');
      if (value.length > 4000000) throw new Error('Calculator storage limit reached');
      data.set(key, value); send({ type: 'storage', key, value });
    },
    removeItem(key) { if (data.delete(key)) send({ type: 'storage', key, value: null }); },
    clear() { for (const key of [...data.keys()]) this.removeItem(key); },
  };
}
