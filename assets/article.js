(function () {
  'use strict';

  var root = document.documentElement;
  var themeButton = document.getElementById('themeToggle');
  var progressBar = document.getElementById('readingBar');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme, persist) {
    var dark = theme === 'dark';
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (themeButton) {
      themeButton.setAttribute('aria-pressed', String(dark));
      themeButton.setAttribute('aria-label', dark ? '切换到日间模式' : '切换到夜间模式');
      themeButton.title = dark ? '切换到日间模式' : '切换到夜间模式';
    }
    if (themeMeta) themeMeta.setAttribute('content', dark ? '#15101f' : '#f9cc3c');
    if (persist) {
      try { localStorage.setItem('dashuki-theme', dark ? 'dark' : 'light'); } catch (e) {}
    }
  }

  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);

  if (themeButton) {
    themeButton.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  function updateProgress() {
    if (!progressBar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var progress = max > 0 ? window.scrollY / max : 0;
    progressBar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, progress)).toFixed(4) + ')';
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  // Copy buttons for code blocks
  document.querySelectorAll('.prose pre').forEach(function (pre) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制这段代码');
    button.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = code ? code.innerText : pre.innerText;
      var done = function () {
        button.textContent = '已复制';
        window.setTimeout(function () { button.textContent = '复制'; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          button.textContent = '复制失败';
        });
      } else {
        var range = document.createRange();
        range.selectNodeContents(code || pre);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        try { document.execCommand('copy'); done(); } catch (e) { button.textContent = '复制失败'; }
        selection.removeAllRanges();
      }
    });
    pre.appendChild(button);
  });
})();
