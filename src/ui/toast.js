// ============================================================
//  toast.js — small transient status messages
// ============================================================

export function createToast(el) {
  let timer = null;
  return function toast(msg, ms = 3200) {
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.add('hidden'), ms);
  };
}
