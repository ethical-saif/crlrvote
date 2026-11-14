(function () {
  const msg = document.getElementById('msg');
  const results = document.getElementById('results');
  const body = document.getElementById('results-body');
  const summary = document.getElementById('summary');
  const btn = document.getElementById('load-btn');
  const keyInput = document.getElementById('admin-key');

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = 'msg ' + type;
  }
  function hideMsg() { msg.className = 'msg hidden'; msg.textContent = ''; }
  function esc(s) { return String(s == null ? '' : s); }

  async function load() {
    hideMsg();
    const key = keyInput.value.trim();
    if (!key) { showMsg('Enter admin key.', 'error'); return; }
    btn.disabled = true;
    try {
      const res = await fetch('/api/admin/results', { headers: { 'x-admin-key': key } });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showMsg(data.error || 'Failed to load results.', 'error');
        btn.disabled = false;
        return;
      }
      body.textContent = '';
      (data.candidates || []).forEach((c) => {
        const tr = document.createElement('tr');
        ['position', 'name', 'rollNo', 'voteCount', 'manifesto'].forEach((k) => {
          const td = document.createElement('td');
          td.textContent = esc(c[k]);
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      summary.textContent = 'Total votes: ' + data.totalVotes + ' | Total students: ' + data.totalStudents;
      results.classList.remove('hidden');
    } catch (e) {
      showMsg('Network error.', 'error');
    } finally {
      btn.disabled = false;
    }
  }

  btn.addEventListener('click', load);
})();
