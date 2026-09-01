/**
 * Theme toggle + persistent 'ac-theme' key (shared with logo preview).
 * No form-capture JS — the pill form is real: hx-post → /jobs/create fragment.
 */
(function () {
  var toggle = document.getElementById('theme-toggle')
  if (!toggle) return
  function label() {
    toggle.textContent =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  }
  toggle.addEventListener('click', function () {
    var t =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = t
    localStorage.setItem('ac-theme', t)
    label()
  })
  label()
})()
