(function () {
  const msg = document.getElementById('msg');
  const loading = document.getElementById('loading');
  const loginView = document.getElementById('login-view');
  const voteView = document.getElementById('vote-view');
  const votedView = document.getElementById('voted-view');
  const rollInput = document.getElementById('roll-input');
  const loginBtn = document.getElementById('login-btn');
  const welcomeText = document.getElementById('welcome-text');
  const voteForm = document.getElementById('vote-form');
  const crSection = document.getElementById('cr-section');
  const lrSection = document.getElementById('lr-section');
  const crList = document.getElementById('cr-list');
  const lrList = document.getElementById('lr-list');
  const noCandidates = document.getElementById('no-candidates');
  const submitVoteBtn = document.getElementById('submit-vote-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const logoutBtnVoted = document.getElementById('logout-btn-voted');

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = 'msg ' + type;
  }
  function hideMsg() { msg.className = 'msg hidden'; msg.textContent = ''; }
  function show(view) {
    [loginView, voteView, votedView, loading].forEach((v) => v.classList.add('hidden'));
    view.classList.remove('hidden');
  }

  async function api(path, options) {
    const opts = Object.assign({ credentials: 'same-origin', headers: {} }, options || {});
    if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(path, opts);
    let data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    return { res, data };
  }

  function createCandidateCard(c, nameAttr) {
    const label = document.createElement('label');
    label.className = 'candidate-card';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = nameAttr;
    input.value = c.id;
    input.style.marginRight = '8px';

    const name = document.createElement('div');
    name.className = 'name';
    name.appendChild(input);
    name.appendChild(document.createTextNode(c.name || '(No name)'));

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = 'Roll: ' + c.rollNo;

    label.appendChild(name);
    label.appendChild(meta);

    if (c.manifesto) {
      const mani = document.createElement('div');
      mani.className = 'manifesto';
      mani.textContent = c.manifesto;
      label.appendChild(mani);
    }

    input.addEventListener('change', () => {
      const list = label.parentElement;
      if (list) {
        Array.from(list.children).forEach((child) => child.classList.remove('selected'));
      }
      if (input.checked) label.classList.add('selected');
    });

    return label;
  }

  async function loadCandidates(name) {
    welcomeText.textContent = name ? ('Welcome, ' + name + '. Please cast your vote.') : 'Please cast your vote.';
    const { res, data } = await api('/api/candidates');
    if (!res.ok || !data.ok) {
      showMsg(data.error || 'Failed to load candidates.', 'error');
      show(voteView);
      return;
    }
    const cands = data.candidates || { CR: [], LR: [] };
    crList.textContent = '';
    lrList.textContent = '';
    const hasCR = Array.isArray(cands.CR) && cands.CR.length > 0;
    const hasLR = Array.isArray(cands.LR) && cands.LR.length > 0;

    if (!hasCR && !hasLR) {
      noCandidates.classList.remove('hidden');
      voteForm.classList.add('hidden');
      show(voteView);
      return;
    }

    noCandidates.classList.add('hidden');
    voteForm.classList.remove('hidden');

    if (hasCR) {
      crSection.classList.remove('hidden');
      cands.CR.forEach((c) => crList.appendChild(createCandidateCard(c, 'crCandidateId')));
    } else {
      crSection.classList.add('hidden');
    }
    if (hasLR) {
      lrSection.classList.remove('hidden');
      cands.LR.forEach((c) => lrList.appendChild(createCandidateCard(c, 'lrCandidateId')));
    } else {
      lrSection.classList.add('hidden');
    }
    show(voteView);
  }

  async function init() {
    hideMsg();
    const { res, data } = await api('/api/me');
    if (!res.ok || !data.ok) {
      show(loginView);
      return;
    }
    if (data.hasVoted) {
      show(votedView);
      return;
    }
    await loadCandidates(data.name);
  }

  loginBtn.addEventListener('click', async () => {
    hideMsg();
    const rollNo = rollInput.value.trim().toLowerCase();
    if (!rollNo) { showMsg('Please enter your roll number.', 'error'); return; }
    loginBtn.disabled = true;
    try {
      const { res, data } = await api('/api/login', { method: 'POST', body: { rollNo } });
      if (!res.ok || !data.ok) {
        showMsg(data.error || 'Login failed.', 'error');
        return;
      }
      if (data.hasVoted) {
        show(votedView);
      } else {
        await loadCandidates(data.name);
      }
    } catch (e) {
      showMsg('Network error. Please try again.', 'error');
    } finally {
      loginBtn.disabled = false;
    }
  });

  rollInput.addEventListener('input', () => {
    rollInput.value = rollInput.value.toLowerCase();
  });

  voteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg();
    const cr = voteForm.querySelector('input[name="crCandidateId"]:checked');
    const lr = voteForm.querySelector('input[name="lrCandidateId"]:checked');
    const body = {};
    if (cr) body.crCandidateId = cr.value;
    if (lr) body.lrCandidateId = lr.value;

    if (!window.confirm('Your vote is final and cannot be changed. Submit now?')) return;

    submitVoteBtn.disabled = true;
    try {
      const { res, data } = await api('/api/vote', { method: 'POST', body });
      if (!res.ok || !data.ok) {
        if (res.status === 409) {
          show(votedView);
          return;
        }
        showMsg(data.error || 'Failed to submit vote.', 'error');
        submitVoteBtn.disabled = false;
        return;
      }
      show(votedView);
    } catch (e) {
      showMsg('Network error. Please try again.', 'error');
      submitVoteBtn.disabled = false;
    }
  });

  async function doLogout() {
    try { await api('/api/logout', { method: 'POST' }); } catch (e) {}
    hideMsg();
    rollInput.value = '';
    submitVoteBtn.disabled = false;
    show(loginView);
  }
  logoutBtn.addEventListener('click', doLogout);
  logoutBtnVoted.addEventListener('click', doLogout);

  init().catch(() => {
    showMsg('Failed to load. Please refresh.', 'error');
    show(loginView);
  });
})();
