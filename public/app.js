const API = '';

// ─── TOAST ───────────────────────────────────────────────────────────────────
const toastEl = document.createElement('div');
toastEl.id = 'toast';
document.body.appendChild(toastEl);

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast-item toast-${type}`;
  el.textContent = msg;
  toastEl.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`page-${page}`).classList.add('active');

    if (page === 'clientes') loadClientes();
    else if (page === 'remetentes') loadRemetentes();
    else if (page === 'mensagens') loadTemplates();
    else if (page === 'logs') loadLogs();
    else if (page === 'conversas') loadConversas();
    else if (page === 'config') loadConfig();
  });
});

// ─── MODAL ───────────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ─── STATUS BAR ──────────────────────────────────────────────────────────────
async function loadStatus() {
  try {
    const r = await fetch(`${API}/api/status`);
    const d = await r.json();
    document.getElementById('statusText').textContent =
      `${d.active_clients} clientes • ${d.active_senders} nº`;
  } catch {
    document.getElementById('statusText').textContent = 'Servidor offline';
  }
}

setInterval(loadStatus, 15000);
loadStatus();

// ─── UTILS ───────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatNextSend(lastSent, intervalHours) {
  if (!lastSent) return '<span class="next-send now">Agora (aguardando)</span>';
  const nextTs = lastSent + Math.floor(intervalHours * 3600);
  const now = Math.floor(Date.now() / 1000);
  const diff = nextTs - now;

  if (diff <= 0) return '<span class="next-send now">Em breve</span>';
  if (diff < 600) {
    const mins = Math.ceil(diff / 60);
    return `<span class="next-send soon">em ${mins} min</span>`;
  }
  const hours = (diff / 3600).toFixed(1);
  return `<span class="next-send">em ${hours}h</span>`;
}

// ─── CLIENTES ────────────────────────────────────────────────────────────────
async function loadClientes() {
  try {
    const r = await fetch(`${API}/api/clients`);
    const clients = await r.json();

    const ativos = clients.filter(c => c.active);
    const inativos = clients.filter(c => !c.active);

    document.getElementById('statsRow').innerHTML = `
      <div class="stat-card">
        <div class="stat-num">${ativos.length}</div>
        <div class="stat-label">Clientes Ativos</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${inativos.length}</div>
        <div class="stat-label">Removidos</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${clients.length}</div>
        <div class="stat-label">Total Cadastrado</div>
      </div>
    `;

    const tbody = document.getElementById('clientesTbody');
    if (clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">Nenhum cliente cadastrado</td></tr>';
      return;
    }

    tbody.innerHTML = clients.map(c => `
      <tr>
        <td><strong>${esc(c.name)}</strong>${c.cpf ? `<br><small style="color:var(--text2)">CPF: ${formatCpf(c.cpf)}</small>` : ''}</td>
        <td>${formatPhone(c.phone)}</td>
        <td>a cada ${c.interval_hours}h</td>
        <td>${formatDate(c.last_sent)}</td>
        <td>${c.active ? formatNextSend(c.last_sent, c.interval_hours) : '—'}</td>
        <td>${c.active
          ? '<span class="badge badge-green">Ativo</span>'
          : '<span class="badge badge-gray">Removido</span>'
        }</td>
        <td>
          <div class="actions">
            ${c.active ? `<button class="btn-danger btn-sm" onclick="removeCliente(${c.id})">Remover</button>` : ''}
            <button class="btn-secondary btn-sm" onclick="deleteCliente(${c.id})">Excluir</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    toast('Erro ao carregar clientes', 'error');
  }
}

function formatCpf(c) {
  const n = (c || '').replace(/\D/g, '');
  if (n.length === 11) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;
  return c;
}

function formatPhone(p) {
  const n = p.replace(/\D/g, '');
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
  return p;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function addCliente() {
  const name = document.getElementById('clienteNome').value.trim();
  const cpf = document.getElementById('clienteCpf').value.trim();
  const phone = document.getElementById('clienteTel').value.trim();
  const interval_hours = parseFloat(document.getElementById('clienteIntervalo').value);

  if (!name || !phone || !cpf) return toast('Preencha nome, CPF e telefone', 'error');

  try {
    const r = await fetch(`${API}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, cpf, phone, interval_hours }),
    });
    const d = await r.json();
    if (!r.ok) return toast(d.error || 'Erro ao adicionar', 'error');

    toast(`${name} adicionado com sucesso!`);
    closeModal('modalAddCliente');
    document.getElementById('clienteNome').value = '';
    document.getElementById('clienteCpf').value = '';
    document.getElementById('clienteTel').value = '';
    document.getElementById('clienteIntervalo').value = '2';
    loadClientes();
    loadStatus();
  } catch (e) {
    toast('Erro de conexão', 'error');
  }
}

async function removeCliente(id) {
  if (!confirm('Parar de enviar mensagens para este cliente?')) return;
  await fetch(`${API}/api/clients/${id}/remove`, { method: 'PATCH' });
  toast('Cliente removido da cobrança');
  loadClientes();
  loadStatus();
}

async function deleteCliente(id) {
  if (!confirm('Excluir este cliente completamente?')) return;
  await fetch(`${API}/api/clients/${id}`, { method: 'DELETE' });
  toast('Cliente excluído');
  loadClientes();
  loadStatus();
}

// Auto-refresh na aba de clientes
setInterval(() => {
  if (document.getElementById('page-clientes').classList.contains('active')) {
    loadClientes();
  }
}, 30000);

// ─── REMETENTES ──────────────────────────────────────────────────────────────
async function loadRemetentes() {
  try {
    const r = await fetch(`${API}/api/senders`);
    const senders = await r.json();

    const el = document.getElementById('remetentesList');
    if (senders.length === 0) {
      el.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text2)">
          <div style="font-size:48px;margin-bottom:16px">📱</div>
          <p style="margin-bottom:8px">Nenhuma instância criada ainda.</p>
          <p>Clique em <strong style="color:var(--text)">+ Nova Instância</strong> para criar e conectar um número.</p>
        </div>`;
      return;
    }

    el.innerHTML = senders.map(s => `
      <div class="sender-card ${s.active ? '' : 'inactive'}" id="sender-card-${s.id}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span class="dot ${s.active ? 'dot-green' : 'dot-red'}"></span>
          <div class="sender-name">${esc(s.label)}</div>
        </div>
        ${s.phone ? `<div style="font-size:13px;color:var(--text);margin-bottom:2px">📞 ${formatPhone(s.phone)}</div>` : ''}
        <div class="sender-instance">🔑 ${esc(s.instance_name)}</div>
        <div class="sender-actions" style="margin-top:14px">
          <button class="btn-secondary btn-sm" onclick="verQrExistente('${esc(s.instance_name)}', '${esc(s.label)}')">
            📷 QR Code
          </button>
          <button class="btn-secondary btn-sm" onclick="toggleSender(${s.id}, ${s.active ? 0 : 1})">
            ${s.active ? '⏸ Pausar' : '▶ Ativar'}
          </button>
          <button class="btn-danger btn-sm" onclick="deleteSenderFull(${s.id}, '${esc(s.instance_name)}')">🗑</button>
        </div>
      </div>
    `).join('');
  } catch {
    toast('Erro ao carregar remetentes', 'error');
  }
}

// ─── CRIAR INSTÂNCIA ─────────────────────────────────────────────────────────
let _qrInstance = null;

function fecharCriarInstancia() {
  closeModal('modalCriarInstancia');
  document.getElementById('formCriarInstancia').style.display = 'block';
  document.getElementById('qrcodeArea').style.display = 'none';
  document.getElementById('novaInstanciaLabel').value = '';
  document.getElementById('novaInstanciaTelefone').value = '';
  document.getElementById('novaInstanciaNome').value = '';
  _qrInstance = null;
}

async function criarInstancia() {
  const label = document.getElementById('novaInstanciaLabel').value.trim();
  const phone = document.getElementById('novaInstanciaTelefone').value.trim();
  const instance_name = document.getElementById('novaInstanciaNome').value.trim().replace(/\s+/g, '-');
  if (!label || !instance_name || !phone) return toast('Preencha todos os campos', 'error');

  const btn = document.getElementById('btnCriarInstancia');
  btn.disabled = true;
  btn.textContent = 'Criando...';

  try {
    const r = await fetch(`${API}/api/senders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, instance_name, phone }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Erro ao criar instância', 'error'); btn.disabled = false; btn.textContent = 'Criar e Gerar QR Code'; return; }

    _qrInstance = instance_name;
    document.getElementById('formCriarInstancia').style.display = 'none';
    document.getElementById('qrcodeArea').style.display = 'block';

    // Exibir QR code
    const qrEl = document.getElementById('qrcodeImagem');
    if (d.base64) {
      qrEl.innerHTML = `<img src="${d.base64}" style="width:250px;height:250px" />`;
    } else {
      await atualizarQr();
    }

    loadRemetentes();
    loadStatus();
  } catch (e) {
    toast('Erro de conexão', 'error');
  }
  btn.disabled = false;
  btn.textContent = 'Criar e Gerar QR Code';
}

async function atualizarQr() {
  if (!_qrInstance) return;
  const qrEl = document.getElementById('qrcodeImagem');
  const statusEl = document.getElementById('qrcodeStatus');
  qrEl.innerHTML = '<p style="color:var(--text2);padding:20px">Carregando QR...</p>';

  try {
    const r = await fetch(`${API}/api/senders/${_qrInstance}/qrcode`);
    const d = await r.json();

    if (d.base64) {
      qrEl.innerHTML = `<img src="${d.base64}" style="width:250px;height:250px" />`;
      statusEl.textContent = 'Escaneie com o WhatsApp para conectar';
      statusEl.style.color = 'var(--yellow)';
    } else if (d.state === 'open') {
      qrEl.innerHTML = '<div style="font-size:48px;padding:20px">✅</div>';
      statusEl.textContent = 'Conectado com sucesso!';
      statusEl.style.color = 'var(--green)';
    } else {
      qrEl.innerHTML = '<p style="color:var(--red);padding:20px">QR não disponível</p>';
      statusEl.textContent = d.error || 'Tente novamente';
    }
  } catch {
    qrEl.innerHTML = '<p style="color:var(--red)">Erro ao buscar QR</p>';
  }
}

// ─── QR DE INSTÂNCIA EXISTENTE ───────────────────────────────────────────────
let _qrExistenteInstance = null;

async function verQrExistente(instance, label) {
  _qrExistenteInstance = instance;
  document.getElementById('qrExistenteTitle').textContent = `Conectar: ${label}`;
  document.getElementById('qrExistenteImagem').innerHTML = '<p style="color:var(--text2)">Carregando...</p>';
  document.getElementById('qrExistenteStatus').textContent = 'Aguardando leitura...';
  openModal('modalQrExistente');
  await reloadQrExistente();
}

async function reloadQrExistente() {
  if (!_qrExistenteInstance) return;
  const qrEl = document.getElementById('qrExistenteImagem');
  const statusEl = document.getElementById('qrExistenteStatus');

  try {
    const r = await fetch(`${API}/api/senders/${_qrExistenteInstance}/qrcode`);
    const d = await r.json();

    if (d.base64) {
      qrEl.innerHTML = `<img src="${d.base64}" style="width:240px;height:240px" />`;
      statusEl.textContent = 'Escaneie com o WhatsApp';
      statusEl.style.color = 'var(--yellow)';
    } else if (d.state === 'open') {
      qrEl.innerHTML = '<div style="font-size:48px;padding:10px">✅</div>';
      statusEl.textContent = 'Já conectado!';
      statusEl.style.color = 'var(--green)';
    } else {
      qrEl.innerHTML = '<p style="color:var(--red)">QR indisponível</p>';
      statusEl.textContent = d.error || 'Instância pode estar desconectada';
    }
  } catch {
    qrEl.innerHTML = '<p style="color:var(--red)">Erro de conexão</p>';
  }
}

async function toggleSender(id, active) {
  await fetch(`${API}/api/senders/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
  loadRemetentes();
}

async function deleteSenderFull(id, instance) {
  if (!confirm(`Excluir a instância "${instance}" da Evolution e do sistema?`)) return;
  const r = await fetch(`${API}/api/senders/${id}/full`, { method: 'DELETE' });
  const d = await r.json();
  if (!r.ok) return toast(d.error || 'Erro ao excluir', 'error');
  toast('Instância excluída');
  loadRemetentes();
  loadStatus();
}

// ─── TEMPLATES ───────────────────────────────────────────────────────────────
async function loadTemplates() {
  try {
    const r = await fetch(`${API}/api/templates`);
    const templates = await r.json();

    const el = document.getElementById('templatesList');
    if (templates.length === 0) {
      el.innerHTML = '<p style="color:var(--text2)">Nenhum template cadastrado</p>';
      return;
    }

    el.innerHTML = templates.map(t => `
      <div class="template-card ${t.active ? '' : 'inactive'}">
        <div class="template-text">${esc(t.text)}</div>
        <div class="template-actions">
          <span class="badge ${t.active ? 'badge-green' : 'badge-gray'}" style="margin-right:auto">
            ${t.active ? 'Ativo' : 'Pausado'}
          </span>
          <button class="btn-secondary btn-sm" onclick="toggleTemplate(${t.id}, ${t.active ? 0 : 1})">
            ${t.active ? 'Pausar' : 'Ativar'}
          </button>
          <button class="btn-danger btn-sm" onclick="deleteTemplate(${t.id})">Excluir</button>
        </div>
      </div>
    `).join('');
  } catch {
    toast('Erro ao carregar templates', 'error');
  }
}

async function addTemplate() {
  const text = document.getElementById('templateText').value.trim();
  if (!text) return toast('Escreva a mensagem', 'error');

  try {
    const r = await fetch(`${API}/api/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const d = await r.json();
    if (!r.ok) return toast(d.error || 'Erro', 'error');

    toast('Template salvo!');
    closeModal('modalAddTemplate');
    document.getElementById('templateText').value = '';
    loadTemplates();
  } catch {
    toast('Erro de conexão', 'error');
  }
}

async function toggleTemplate(id, active) {
  await fetch(`${API}/api/templates/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
  loadTemplates();
}

async function deleteTemplate(id) {
  if (!confirm('Excluir esta mensagem?')) return;
  await fetch(`${API}/api/templates/${id}`, { method: 'DELETE' });
  toast('Template excluído');
  loadTemplates();
}

// ─── LOGS ────────────────────────────────────────────────────────────────────
async function loadLogs() {
  try {
    const r = await fetch(`${API}/api/logs?limit=200`);
    const logs = await r.json();

    const tbody = document.getElementById('logsTbody');
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum envio registrado ainda</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td style="white-space:nowrap">${formatDate(l.sent_at)}</td>
        <td>${esc(l.client_name || '—')}</td>
        <td>${l.client_phone ? formatPhone(l.client_phone) : '—'}</td>
        <td><code>${esc(l.sender_instance || '—')}</code></td>
        <td>
          ${l.status === 'enviado'
            ? '<span class="badge badge-green">Enviado</span>'
            : `<span class="badge badge-red">Erro</span>`
          }
          ${l.error ? `<br><small style="color:var(--red)">${esc(l.error)}</small>` : ''}
        </td>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(l.template_text || '')}">
          ${esc((l.template_text || '').substring(0, 80))}${(l.template_text || '').length > 80 ? '…' : ''}
        </td>
      </tr>
    `).join('');
  } catch {
    toast('Erro ao carregar histórico', 'error');
  }
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
async function loadConfig() {
  try {
    const r = await fetch(`${API}/api/settings`);
    const d = await r.json();
    document.getElementById('configUrl').value = d.evolution_url || '';
    document.getElementById('configApiKey').value = d.evolution_apikey || '';
  } catch {
    toast('Erro ao carregar configurações', 'error');
  }
}

async function saveConfig() {
  const evolution_url = document.getElementById('configUrl').value.trim();
  const evolution_apikey = document.getElementById('configApiKey').value.trim();

  try {
    const r = await fetch(`${API}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evolution_url, evolution_apikey }),
    });
    if (!r.ok) throw new Error();

    const msg = document.getElementById('configMsg');
    msg.textContent = 'Configurações salvas com sucesso!';
    msg.className = 'msg success';
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
    toast('Configurações salvas!');
  } catch {
    toast('Erro ao salvar configurações', 'error');
  }
}

// ─── IMPORT CSV ──────────────────────────────────────────────────────────────
async function importCSV() {
  const fileInput = document.getElementById('csvFileInput');
  const interval_hours = parseFloat(document.getElementById('csvIntervalo').value) || 2;

  if (!fileInput.files || fileInput.files.length === 0) {
    return toast('Selecione um arquivo CSV', 'error');
  }

  const file = fileInput.files[0];
  const text = await file.text();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length === 0) return toast('Arquivo CSV vazio', 'error');

  // Detectar se primeira linha é header
  const firstLine = lines[0].toLowerCase();
  const isHeader = firstLine.includes('nome') || firstLine.includes('telefone') || firstLine.includes('phone') || firstLine.includes('name');
  const dataLines = isHeader ? lines.slice(1) : lines;

  if (dataLines.length === 0) return toast('Nenhum dado encontrado no CSV', 'error');

  const clients = dataLines.map(line => {
    const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    return { name: parts[0] || '', phone: parts[1] || '', cpf: parts[2] || '' };
  }).filter(c => c.name || c.phone);

  if (clients.length === 0) return toast('Nenhum cliente válido encontrado', 'error');

  try {
    const r = await fetch(`${API}/api/clients/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients, interval_hours }),
    });
    const d = await r.json();
    if (!r.ok) return toast(d.error || 'Erro ao importar', 'error');

    toast(`${d.imported} cliente(s) importado(s) com sucesso!`);
    if (d.errors && d.errors.length > 0) {
      console.warn('Erros na importação:', d.errors);
      toast(`${d.errors.length} linha(s) com erro — veja o console`, 'error');
    }
    closeModal('modalImportCSV');
    fileInput.value = '';
    document.getElementById('csvIntervalo').value = '2';
    loadClientes();
    loadStatus();
  } catch (e) {
    toast('Erro de conexão', 'error');
  }
}

// ─── CONVERSAS ───────────────────────────────────────────────────────────────
let _chatInstance = null;
let _chatPhone = null;
let _chatPollingTimer = null;
let _allChats = [];

async function loadConversas() {
  const listEl = document.getElementById('chatList');
  listEl.innerHTML = '<div style="padding:20px;color:var(--text2);text-align:center">Carregando todas as conversas...</div>';

  try {
    const r = await fetch(`${API}/api/chat/conversations`);
    const data = await r.json();
    _allChats = Array.isArray(data) ? data : [];
    renderChatList(_allChats);
  } catch (e) {
    listEl.innerHTML = '<div style="padding:20px;color:var(--red);text-align:center">Erro ao carregar conversas</div>';
    toast('Erro: ' + e.message, 'error');
  }
}

function filterConversas() {
  const q = (document.getElementById('chatSearch')?.value || '').toLowerCase().trim();
  if (!q) return renderChatList(_allChats);
  const filtered = _allChats.filter(c =>
    (c.clientName || '').toLowerCase().includes(q) ||
    (c.phone || '').includes(q)
  );
  renderChatList(filtered);
}

function renderChatList(chats) {
  const listEl = document.getElementById('chatList');
  if (!chats.length) {
    listEl.innerHTML = '<div style="padding:20px;color:var(--text2);text-align:center">Nenhuma conversa encontrada</div>';
    return;
  }
  listEl.innerHTML = chats.map(chat => {
    const phone = chat.phone || (chat.remoteJid || '').replace('@s.whatsapp.net', '');
    const name = chat.clientName || chat.pushName || formatPhone(phone) || phone;
    const lastMsg = extractMsgText(chat.lastMessage || {});
    const timeStr = chat.updatedAt ? formatChatTime(chat.updatedAt) : '';
    const instance = chat.instance || '';

    return `<div class="chat-list-item" data-phone="${esc(phone)}" onclick="openChat('${esc(phone)}','${esc(name)}','${esc(instance)}')">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div class="contact-name">${esc(name)}</div>
        <div style="font-size:10px;color:var(--text2);white-space:nowrap;margin-left:8px">${timeStr}</div>
      </div>
      <div class="last-msg">${esc(lastMsg || '')}</div>
      ${instance ? `<div style="font-size:10px;color:var(--accent2);margin-top:2px">📱 ${esc(instance)}</div>` : ''}
    </div>`;
  }).join('');
}

async function openChat(phone, name, instance) {
  _chatPhone = phone;
  _chatInstance = instance;

  document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active'));
  const item = document.querySelector(`.chat-list-item[data-phone="${phone}"]`);
  if (item) item.classList.add('active');

  await loadMessages(phone, name);

  if (_chatPollingTimer) clearInterval(_chatPollingTimer);
  _chatPollingTimer = setInterval(() => {
    if (_chatPhone === phone && document.getElementById('page-conversas').classList.contains('active')) {
      loadMessages(phone, name, true);
    } else {
      clearInterval(_chatPollingTimer);
    }
  }, 30000);
}

async function loadMessages(phone, name, silent = false) {
  const windowEl = document.getElementById('chatWindow');

  if (!silent) {
    windowEl.innerHTML = `
      <div class="chat-window-header">${esc(name)}</div>
      <div class="chat-messages" id="chatMessages"><div style="color:var(--text2);text-align:center;padding:20px">Carregando...</div></div>
      <div class="chat-input-area">
        <input type="text" id="chatMsgInput" placeholder="Digite uma mensagem..." onkeydown="if(event.key==='Enter')sendChatMsg('${esc(phone)}','${esc(name)}')" />
        <button class="btn-primary btn-sm" onclick="sendChatMsg('${esc(phone)}','${esc(name)}')">Enviar</button>
      </div>`;
  }

  const instance = _chatInstance;

  try {
    const r = await fetch(`${API}/api/chat/messages?phone=${encodeURIComponent(phone)}`);
    const data = await r.json();

    const msgs = Array.isArray(data) ? data : (data.messages || []);
    const messagesEl = document.getElementById('chatMessages');
    if (!messagesEl) return;

    if (msgs.length === 0) {
      messagesEl.innerHTML = '<div style="color:var(--text2);text-align:center;padding:20px">Nenhuma mensagem</div>';
      return;
    }

    messagesEl.innerHTML = msgs.map(msg => {
      const fromMe = msg.from_me === true || msg.from_me === 't';
      const text = msg.text || '(mídia)';
      const timeStr = msg.timestamp ? formatChatTime(Number(msg.timestamp)) : '';
      return `<div class="msg-bubble ${fromMe ? 'sent' : 'received'}">
        ${esc(text)}
        <div class="msg-time">${timeStr}</div>
      </div>`;
    }).join('');

    // Auto-scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } catch (e) {
    const messagesEl = document.getElementById('chatMessages');
    if (messagesEl) messagesEl.innerHTML = `<div style="color:var(--red);text-align:center;padding:20px">Erro ao carregar mensagens</div>`;
  }
}

async function sendChatMsg(phone, name) {
  const input = document.getElementById('chatMsgInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.disabled = true;

  try {
    const r = await fetch(`${API}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance: _chatInstance, phone, text }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Erro ao enviar', 'error'); input.value = text; }
    else await loadMessages(phone, name, true);
  } catch {
    toast('Erro de conexão', 'error');
    input.value = text;
  }
  input.disabled = false;
  input.focus();
}

function extractMsgText(msgObj) {
  if (!msgObj) return '';
  const msg = msgObj.message || msgObj;
  return msg.conversation
    || msg.extendedTextMessage?.text
    || msg.imageMessage?.caption
    || '';
}

function formatChatTime(ts) {
  const d = new Date((typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts));
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Stop polling when leaving conversas page
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.page !== 'conversas' && _chatPollingTimer) {
      clearInterval(_chatPollingTimer);
      _chatPollingTimer = null;
    }
  });
});

// ─── INIT ────────────────────────────────────────────────────────────────────
loadClientes();
