import { describe, expect, it, vi } from 'vitest';
import { cleanStorage, createNativeStorage } from '../mobile/bridge/storage.js';

describe('native session storage bridge', () => {
  it('restores only known string records and leaves engine validation to the engine', () => {
    expect(cleanStorage({ 'ba-ii-plus-preview-v1': '{"version":1}', secret: 'ignored', 'ba-ii-plus-preview-v1-ui': 7 })).toEqual({ 'ba-ii-plus-preview-v1': '{"version":1}' });
    expect(cleanStorage(null)).toEqual({});
  });
  it('keeps writes immediately readable and sends ordered native persistence messages', () => {
    const send = vi.fn(), storage = createNativeStorage({}, send);
    storage.setItem('ba-ii-plus-preview-v1', 'one');
    storage.setItem('ba-ii-plus-preview-v1', 'two');
    expect(storage.getItem('ba-ii-plus-preview-v1')).toBe('two');
    expect(storage.length).toBe(1);
    expect(send.mock.calls.map(([message]) => message.value)).toEqual(['one', 'two']);
    storage.removeItem('ba-ii-plus-preview-v1');
    expect(storage.getItem('ba-ii-plus-preview-v1')).toBeNull();
    expect(send).toHaveBeenLastCalledWith({ type: 'storage', key: 'ba-ii-plus-preview-v1', value: null });
  });
  it('retains full decimal strings, clears all saved fields, and rejects unknown or oversized values', () => {
    const send = vi.fn(), storage = createNativeStorage({ 'ba-ii-plus-preview-v1-ui': '0.058823529411764705882' }, send);
    expect(storage.getItem(storage.key(0))).toBe('0.058823529411764705882');
    expect(() => storage.setItem('unexpected', 'value')).toThrow();
    expect(() => storage.setItem('ba-ii-plus-preview-v1', 'x'.repeat(4000001))).toThrow();
    storage.clear(); expect(storage.length).toBe(0);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
