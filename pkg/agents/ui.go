package agents

// chatHTML is the embedded, self-contained chat surface served at /v1/agent.
// No external resources (CSP-safe). It lists the caller's cloud agents, runs
// the selected one against api.hanzo.ai/v1/agents via the same-origin proxy
// above, and renders the result. Auth is the HttpOnly hanzo_iam_token cookie —
// page JS never sees a token.
const chatHTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hanzo Team — Agent</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    background: #000; color: #e4e4e7;
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column;
  }
  header {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 20px; border-bottom: 1px solid #1a1a1a;
  }
  header .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
  header h1 { font-size: 14px; font-weight: 600; margin: 0; letter-spacing: .2px; }
  header select {
    margin-left: auto; background: #0a0a0a; color: #e4e4e7;
    border: 1px solid #262626; border-radius: 8px; padding: 6px 10px; font-size: 13px;
  }
  #log { flex: 1; overflow-y: auto; padding: 20px; max-width: 820px; width: 100%; margin: 0 auto; }
  .msg { margin: 0 0 16px; white-space: pre-wrap; word-wrap: break-word; }
  .msg .who { font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: #71717a; margin-bottom: 4px; }
  .msg.user .bubble { color: #fafafa; }
  .msg.agent .bubble { color: #d4d4d8; }
  .msg.err .bubble { color: #f87171; }
  form {
    display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid #1a1a1a;
    max-width: 820px; width: 100%; margin: 0 auto;
  }
  textarea {
    flex: 1; resize: none; height: 44px; max-height: 160px;
    background: #0a0a0a; color: #fafafa; border: 1px solid #262626;
    border-radius: 10px; padding: 11px 14px; font: inherit;
  }
  textarea:focus { outline: none; border-color: #3f3f46; }
  button {
    background: #fafafa; color: #000; border: 0; border-radius: 10px;
    padding: 0 20px; font-weight: 600; cursor: pointer;
  }
  button:disabled { opacity: .5; cursor: default; }
  .hint { color: #52525b; font-size: 12px; text-align: center; padding: 8px; }
</style>
</head>
<body>
  <header>
    <span class="dot"></span>
    <h1>Hanzo Agent</h1>
    <select id="agent" aria-label="Agent"></select>
  </header>
  <div id="log"></div>
  <form id="f">
    <textarea id="in" placeholder="Message the agent…" autofocus></textarea>
    <button id="send" type="submit">Send</button>
  </form>
  <div class="hint" id="hint"></div>
<script>
  var log = document.getElementById('log');
  var sel = document.getElementById('agent');
  var input = document.getElementById('in');
  var sendBtn = document.getElementById('send');
  var hint = document.getElementById('hint');

  function esc(s){ var d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }
  function add(who, cls, text){
    var el = document.createElement('div');
    el.className = 'msg ' + cls;
    el.innerHTML = '<div class="who">'+esc(who)+'</div><div class="bubble">'+esc(text)+'</div>';
    log.appendChild(el); log.scrollTop = log.scrollHeight; return el;
  }

  async function loadAgents(){
    try {
      var r = await fetch('/v1/agents', { headers: { 'Accept': 'application/json' } });
      if (r.status === 401){ hint.textContent = 'Not signed in — open hanzo.team, sign in, then reload.'; sendBtn.disabled = true; return; }
      var j = await r.json();
      var list = (j && j.agents) || [];
      if (!list.length){ hint.textContent = 'No agents in your org yet.'; return; }
      list.forEach(function(a){
        var o = document.createElement('option');
        o.value = a.name; o.textContent = a.displayName || a.name;
        sel.appendChild(o);
      });
      hint.textContent = list.length + ' agent' + (list.length>1?'s':'') + ' available';
    } catch(e){ hint.textContent = 'Could not load agents: ' + e.message; }
  }

  async function run(text){
    var name = sel.value;
    if (!name){ add('system','err','Pick an agent first.'); return; }
    add('You','user', text);
    var thinking = add(name,'agent','…');
    sendBtn.disabled = true;
    try {
      var r = await fetch('/v1/agents/' + encodeURIComponent(name) + '/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ input: text })
      });
      var j = await r.json().catch(function(){ return {}; });
      var out = j.output != null ? j.output : (j.error || ('HTTP ' + r.status));
      thinking.querySelector('.bubble').textContent = out;
      if (!r.ok) thinking.className = 'msg err';
    } catch(e){
      thinking.className = 'msg err';
      thinking.querySelector('.bubble').textContent = 'Request failed: ' + e.message;
    } finally {
      sendBtn.disabled = false; input.focus();
    }
  }

  document.getElementById('f').addEventListener('submit', function(e){
    e.preventDefault();
    var t = input.value.trim();
    if (!t) return;
    input.value = '';
    run(t);
  });
  input.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); document.getElementById('f').requestSubmit(); }
  });

  loadAgents();
</script>
</body>
</html>`
