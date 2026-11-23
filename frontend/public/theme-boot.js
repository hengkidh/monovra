// Runs synchronously before CSS paints so the first frame uses the saved theme.
(function () {
  try {
    var t = new URLSearchParams(location.search).get('theme');
    if (t === 'auto') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'black' : 'white';
    if (t === 'black' || t === 'white') document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
