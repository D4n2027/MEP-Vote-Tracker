(() => {
  function loadScript(src, onload) {
    if (document.querySelector(`script[data-mep-loader="${src}"]`)) {
      if (onload) onload();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.dataset.mepLoader = src;
    if (onload) script.onload = onload;
    script.onerror = () => console.error('Unable to load', src);
    document.body.appendChild(script);
  }

  loadScript('/theme-ui.js', () => {
    loadScript('/policy-core.js', () => {
      loadScript('/profiles.js');
      loadScript('/party-ui.js');
    });
  });
})();