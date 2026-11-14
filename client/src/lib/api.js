export async function api(path, options = {}) {
  const opts = { credentials: 'same-origin', headers: {}, ...options };
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, opts);
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  return { res, data };
}
