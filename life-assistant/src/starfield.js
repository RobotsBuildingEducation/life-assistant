export function initStarfield() {
  const starfield = document.querySelector('.starfield');
  if (!starfield) return;

  function rand() {
    return Math.round(Math.random() * 100 - 50) + 'px';
  }

  function moveLayer1() {
    starfield.style.setProperty('--x1', rand());
    starfield.style.setProperty('--y1', rand());
  }

  function moveLayer2() {
    starfield.style.setProperty('--x2', rand());
    starfield.style.setProperty('--y2', rand());
  }

  moveLayer1();
  moveLayer2();
  setInterval(moveLayer1, 30000);
  setInterval(moveLayer2, 45000);
}
