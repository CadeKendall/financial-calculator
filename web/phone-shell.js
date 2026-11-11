// The preview models a system area; production uses the device's safe-area insets.
const phonePreview=new URLSearchParams(location.search).get('view')==='iphone';
if(phonePreview)document.title='iPhone layout preview · Financial calculator';
const standalonePhone=matchMedia('(display-mode: standalone) and (max-width: 660px)');
function updatePhoneShell(){
  document.documentElement.classList.toggle('phone-shell',phonePreview||standalonePhone.matches||!!window.__BA_NATIVE__||!!window.__BA_DESKTOP__);
  document.documentElement.classList.toggle('phone-preview',phonePreview);
}
standalonePhone.addEventListener('change',updatePhoneShell);updatePhoneShell();

