const toast = document.querySelector('#toast');

function getVisitorId() {
  let id = localStorage.getItem('xuantiangame-visitor');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('xuantiangame-visitor', id);
  }
  return id;
}

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '暂时无法完成请求，请稍后再试。');
  return data;
}

async function loadLikes() {
  try {
    const { likes } = await api('/api/likes');
    for (const [gameId, count] of Object.entries(likes)) {
      const button = document.querySelector(`[data-like="${gameId}"]`);
      if (button) button.querySelector('b').textContent = String(count);
    }
  } catch {
    // The game links remain usable if the optional like counter is unavailable.
  }
}

document.querySelectorAll('.like-button').forEach((button) => {
  const gameId = button.dataset.like;
  button.classList.toggle('is-liked', localStorage.getItem(`xuantiangame-liked-${gameId}`) === 'yes');
  button.setAttribute('aria-pressed', String(button.classList.contains('is-liked')));
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const result = await api(`/api/games/${gameId}/like`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: getVisitorId() })
      });
      button.querySelector('b').textContent = String(result.count);
      button.classList.toggle('is-liked', result.liked);
      button.setAttribute('aria-pressed', String(result.liked));
      localStorage.setItem(`xuantiangame-liked-${gameId}`, result.liked ? 'yes' : 'no');
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
  });
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

const menuToggle = document.querySelector('.menu-toggle');
menuToggle.addEventListener('click', () => {
  const nav = document.querySelector('.main-nav');
  const isOpen = nav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
document.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', () => {
  document.querySelector('.main-nav').classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

loadLikes();
