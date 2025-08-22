// loader-voith.js
window.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("voith-loader");
  const MIN_TIME = 1000; // tempo mínimo visível para evitar "piscar"

  const start = performance.now();
  const hideLoader = () => {
    const elapsed = performance.now() - start;
    const delay = Math.max(0, MIN_TIME - elapsed);
    setTimeout(() => {
      loader?.classList.add("is-hidden");
    }, delay);
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    hideLoader();
  } else {
    window.addEventListener("load", hideLoader, { once: true });
  }

  // Se quiser usar manualmente em outras ações:
  window.MCLoader = {
    show: () => loader?.classList.remove('is-hidden'),
    hide: () => loader?.classList.add('is-hidden')
  };
});
