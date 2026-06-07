(() => {
  const labels = ['KING OF FIGHTERS - YAGAMI', 'GENSHIN IMPACT - X CONCEPT'];

  function updateModelStatus() {
    const section = document.querySelector('.developmentSection:first-child');
    if (!section) return false;

    const items = section.querySelectorAll('.developmentItem strong');
    labels.forEach((label, index) => {
      if (items[index] && items[index].textContent !== label) {
        items[index].textContent = label;
      }
    });

    return items.length >= labels.length;
  }

  let attempts = 0;
  const interval = window.setInterval(() => {
    attempts += 1;
    if (updateModelStatus() || attempts > 40) {
      window.clearInterval(interval);
    }
  }, 250);
})();
