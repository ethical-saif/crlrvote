(function () {
  const form = document.getElementById('register-form');
  const msg = document.getElementById('msg');
  const btn = document.getElementById('register-btn');
  const rollInput = document.getElementById('rollNo');

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = 'msg ' + type;
  }
  function hideMsg() { msg.className = 'msg hidden'; msg.textContent = ''; }

  rollInput.addEventListener('input', () => {
    rollInput.value = rollInput.value.toLowerCase();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg();
    const rollNo = document.getElementById('rollNo').value.trim().toLowerCase();
    const name = document.getElementById('name').value.trim();
    const position = document.getElementById('position').value;
    const manifesto = document.getElementById('manifesto').value.trim();

    btn.disabled = true;
    try {
      const res = await fetch('/api/candidates/register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo, name, position, manifesto }),
      });
      let data = {};
      try { data = await res.json(); } catch (err) { data = {}; }
      if (!res.ok || !data.ok) {
        showMsg(data.error || 'Registration failed.', 'error');
        btn.disabled = false;
        return;
      }
      showMsg(data.message || 'Registered successfully.', 'success');
      form.reset();
    } catch (e) {
      showMsg('Network error. Please try again.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
})();
