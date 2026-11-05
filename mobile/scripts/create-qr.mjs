import QRCode from 'qrcode';
const url='exp://10.0.0.126:8081';
const response=await fetch('http://10.0.0.126:8081/',{headers:{'expo-platform':'ios',accept:'application/expo+json'},signal:AbortSignal.timeout(20000)});
const manifest=await response.json();
console.log(JSON.stringify({status:response.status,sdk:manifest.extra?.expoClient?.sdkVersion,name:manifest.extra?.expoClient?.name,bundle:manifest.launchAsset?.url}));
if(!response.ok || !manifest.launchAsset?.url)throw new Error('Expo manifest is not ready');
await QRCode.toFile('../../expo-go-iphone-qr.png',url,{width:360,margin:3,errorCorrectionLevel:'M'});
console.log('QR ready: '+url);
