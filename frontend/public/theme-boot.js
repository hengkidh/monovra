// Runs synchronously before CSS paints so the first frame uses the saved theme.
(function () {
  try {
    var t = new URLSearchParams(location.search).get('theme');
    if (t === 'black' || t === 'white') document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
