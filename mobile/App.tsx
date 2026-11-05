import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { calculatorHtml } from './generated/calculator';
import { cleanStorage, STORAGE_KEYS } from './bridge/storage';

const SESSION = 'financial-calculator-native-v1';
type Saved = Record<string, string>;
type Boot = { storage: Saved; insets: { top: number; bottom: number; left: number; right: number } };
const scriptJSON = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

function Calculator() {
  const insets = useSafeAreaInsets();
  const initialInsets = useRef(insets);
  const web = useRef<WebView>(null);
  const saved = useRef<Saved>({});
  const writes = useRef<Promise<void>>(Promise.resolve());
  const holdTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hapticsEnabled = useRef(true);
  const active = useRef(AppState.currentState === 'active');
  const [boot, setBoot] = useState<Boot | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [generation, setGeneration] = useState(0);
  const [background, setBackground] = useState('#272a29');
  const [statusStyle, setStatusStyle] = useState<'light' | 'dark'>('dark');
  const cancelHold = useCallback(() => { holdTimers.current.forEach(clearTimeout); holdTimers.current = []; }, []);
  const load = useCallback(async () => {
    cancelHold();
    try {
      await writes.current;
      setError(''); setReady(false);
      const raw = await AsyncStorage.getItem(SESSION);
      saved.current = raw ? cleanStorage(JSON.parse(raw)) : {};
      hapticsEnabled.current = saved.current['ba-ii-plus-preview-v1-haptics'] !== 'off';
      setBoot({ storage: { ...saved.current }, insets: initialInsets.current });
      setGeneration(value => value + 1);
    } catch { setError('Your saved calculator could not be loaded. Tap Retry to try again.'); }
  }, [cancelHold]);
  useEffect(() => { void writes.current.then(load); }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { active.current = state === 'active'; if (!active.current) cancelHold(); });
    return () => { subscription.remove(); cancelHold(); };
  }, [cancelHold]);
  useEffect(() => {
    if (ready) web.current?.injectJavaScript(`window.__setNativeInsets?.(${scriptJSON(insets)});true;`);
  }, [insets, ready]);
  useEffect(() => {
    if (!boot || ready || error) return;
    const timer = setTimeout(() => setError('The calculator took too long to open. Tap Retry.'), 20000);
    return () => clearTimeout(timer);
  }, [boot, ready, error]);
  const source = useMemo(() => boot ? {
    html: calculatorHtml.replace('/*NATIVE_BOOTSTRAP*/', () => `window.__BA_NATIVE__=${scriptJSON(boot)};`),
    baseUrl: 'https://calculator.local/',
  } : null, [boot]);
  const pulse = (style?: Haptics.ImpactFeedbackStyle) => {
    if (!hapticsEnabled.current || !active.current) return;
    void (style ? Haptics.impactAsync(style) : Haptics.selectionAsync()).catch(() => {});
  };
  const message = (event: WebViewMessageEvent) => {
    try {
      if (event.nativeEvent.data.length > 4100000) return;
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') setReady(true);
      else if (data.type === 'storage' && STORAGE_KEYS.includes(data.key) && (data.value === null || typeof data.value === 'string' && data.value.length <= 4000000)) {
        if (data.value === null) delete saved.current[data.key]; else saved.current[data.key] = data.value;
        const snapshot = JSON.stringify(saved.current);
        writes.current = writes.current.then(() => AsyncStorage.setItem(SESSION, snapshot)).catch(() => { setError('Your latest changes could not be saved. Tap Retry after checking device storage.'); });
      } else if (data.type === 'copy' && typeof data.text === 'string' && data.text.length <= 150 && Number.isInteger(data.id)) {
        void Clipboard.setStringAsync(data.text).then(() => web.current?.injectJavaScript(`window.__nativeReply(${data.id},true);true;`)).catch(() => web.current?.injectJavaScript(`window.__nativeReply(${data.id},false);true;`));
      } else if (data.type === 'haptics' && typeof data.enabled === 'boolean') { hapticsEnabled.current = data.enabled; cancelHold(); }
      else if (data.type === 'tap') pulse();
      else if (data.type === 'hold') {
        cancelHold();
        if (data.phase === 'start') {
          holdTimers.current = [setTimeout(() => pulse(), 180), setTimeout(() => pulse(Haptics.ImpactFeedbackStyle.Light), 380)];
        } else if (data.phase === 'complete') pulse(Haptics.ImpactFeedbackStyle.Medium);
      } else if (data.type === 'theme' && /^#[0-9a-f]{6}$/i.test(data.background) && /^#[0-9a-f]{6}$/i.test(data.ink)) {
        setBackground(data.background); setStatusStyle(data.ink.toLowerCase() === '#ffffff' ? 'light' : 'dark');
      } else if (data.type === 'link' && typeof data.url === 'string' && data.url.startsWith('https://education.ti.com/')) {
        void Linking.openURL(data.url).catch(() => {});
      } else if (data.type === 'error') setError('The calculator encountered a display error. Tap Retry to reopen your saved session.');
    } catch { /* Ignore malformed bridge messages without affecting the engine. */ }
  };
  return <View style={[styles.root, { backgroundColor: background }]}>
    <StatusBar style={statusStyle} />
    {source && <WebView key={generation} ref={web} source={source} style={[styles.web, { backgroundColor: background }]}
      originWhitelist={['*']} onMessage={message} javaScriptEnabled domStorageEnabled
      bounces={false} scrollEnabled={false} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}
      showsVerticalScrollIndicator={false} setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url === 'https://calculator.local/'}
      onError={() => setError('The calculator could not open. Tap Retry.')}
      onContentProcessDidTerminate={() => { void load(); }} />}
    {(!ready || error) && <View style={[styles.loading, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      {error ? <><Text style={styles.message}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text>Retry</Text></Pressable></>
        : <><ActivityIndicator color="#d8c382" /><Text style={styles.message}>Opening your calculator…</Text></>}
    </View>}
  </View>;
}
export default function App() { return <SafeAreaProvider initialMetrics={initialWindowMetrics}><Calculator /></SafeAreaProvider>; }
const styles = StyleSheet.create({
  root: { flex: 1 }, web: { flex: 1 },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#272a29', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  message: { color: '#f0f1e9', fontSize: 17, textAlign: 'center', lineHeight: 25 },
  retry: { backgroundColor: '#d8c382', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
});
