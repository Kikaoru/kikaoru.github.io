
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  try {
    var t = localStorage.getItem('dashuki-theme');
    if (t === 'dark' || t === 'light') d.setAttribute('data-theme', t);
  } catch (e) {}
})();
