const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Estrutura inicial do banco
const INITIAL = {
  settings: {
    evolution_url: 'http://localhost:8080',
    evolution_apikey: '',
  },
  senders: [],
  templates: [],
  clients: [],
  logs: [],
  _nextId: { senders: 1, templates: 1, clients: 1, logs: 1 },
};

// Carregar ou criar banco
function load() {
  if (!fs.existsSync(DB_FILE)) {
    // Adicionar templates de exemplo
    const data = JSON.parse(JSON.stringify(INITIAL));
    const templateTexts = [
      '{nome} | CPF: {cpf}\n\nEste contato refere-se a uma pendência financeira vinculada a um pedido do Erecton Men já entregue e confirmado.\nÉ necessário retorno imediato para regularização do pagamento. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nIdentificamos pendência de pagamento referente a pedido do Erecton Men devidamente entregue.\nSolicitamos retorno para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men entregue e confirmado permanece com pagamento em aberto.\nÉ necessário retorno para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nConsta em sistema pedido do Erecton Men entregue com pendência financeira ativa.\nFavor retornar para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nReferente ao Erecton Men: pedido entregue e pagamento não identificado até o momento.\nNecessário retorno imediato. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men foi entregue conforme contratado e segue com pendência de pagamento.\nAguardamos retorno para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPendência financeira identificada referente a pedido do Erecton Men já entregue.\nRetorno necessário para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men entregue e confirmado permanece sem quitação.\nSolicitamos retorno imediato. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nRegistro de entrega do Erecton Men consta confirmado, porém sem pagamento.\nNecessária regularização imediata. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men foi devidamente entregue e permanece com pendência financeira.\nRetorne para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nConsta em sistema entrega confirmada do Erecton Men com pagamento pendente.\nFavor retornar para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men entregue conforme contratação segue sem pagamento registrado.\nNecessário retorno imediato. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPendência referente ao Erecton Men permanece ativa após confirmação de entrega.\nAguardamos retorno para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men entregue e vinculado a pagamento ainda não realizado.\nRetorne para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nEntrega do Erecton Men confirmada e pagamento não identificado.\nRegularização necessária. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPendência financeira ativa referente a pedido do Erecton Men já entregue.\nFavor retornar imediatamente. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men entregue e confirmado permanece sem regularização de pagamento.\nRetorno necessário. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nConsta entrega do Erecton Men e ausência de quitação até o momento.\nNecessária regularização imediata. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men foi entregue e segue com pagamento em aberto.\nAguardamos retorno para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nRegistro de entrega do Erecton Men confirmado, com pendência financeira ativa.\nFavor retornar. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men entregue conforme contratado permanece sem pagamento.\nNecessária regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPendência identificada referente a pedido do Erecton Men já entregue.\nRetorne para regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nConsta entrega confirmada do Erecton Men e ausência de pagamento.\nRegularização necessária. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men entregue e vinculado a pendência financeira ativa.\nSolicitamos retorno imediato. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nEntrega do Erecton Men confirmada em sistema com pagamento não realizado.\nFavor retornar. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men já entregue permanece com pendência de pagamento.\nNecessária regularização. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nConsta em sistema entrega do Erecton Men com pagamento em aberto.\nRetorno necessário. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPendência financeira referente ao Erecton Men permanece ativa após entrega confirmada.\nAguardamos retorno. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nPedido do Erecton Men entregue conforme registro permanece sem quitação.\nRegularização necessária. 📞+5511959777425',
      '{nome} | CPF: {cpf}\n\nIdentificada pendência de pagamento referente ao Erecton Men já entregue.\nSolicitamos retorno imediato para regularização. 📞+5511959777425',
    ];
    const now = Math.floor(Date.now() / 1000);
    templateTexts.forEach(text => {
      data.templates.push({ id: data._nextId.templates++, text, active: 1, created_at: now });
    });
    save(data);
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function nowTs() { return Math.floor(Date.now() / 1000); }

// ─── API ─────────────────────────────────────────────────────────────────────

module.exports = {
  // Settings
  getSetting(key) { return load().settings[key]; },
  setSetting(key, value) { const d = load(); d.settings[key] = value; save(d); },
  getAllSettings() { return load().settings; },

  // Senders
  getSenders() { return load().senders.slice().reverse(); },
  getActiveSenders() { return load().senders.filter(s => s.active); },
  addSender(label, instance_name, phone = '') {
    const d = load();
    if (d.senders.find(s => s.instance_name === instance_name)) throw new Error('Já existe');
    d.senders.push({ id: d._nextId.senders++, label, instance_name, phone, active: 1, created_at: nowTs() });
    save(d);
  },
  toggleSender(id, active) {
    const d = load();
    const s = d.senders.find(s => s.id == id);
    if (s) s.active = active;
    save(d);
  },
  deleteSender(id) {
    const d = load();
    d.senders = d.senders.filter(s => s.id != id);
    save(d);
  },

  // Templates
  getTemplates() { return load().templates.slice().reverse(); },
  getActiveTemplates() { return load().templates.filter(t => t.active); },
  addTemplate(text) {
    const d = load();
    d.templates.push({ id: d._nextId.templates++, text, active: 1, created_at: nowTs() });
    save(d);
  },
  toggleTemplate(id, active) {
    const d = load();
    const t = d.templates.find(t => t.id == id);
    if (t) t.active = active;
    save(d);
  },
  deleteTemplate(id) {
    const d = load();
    d.templates = d.templates.filter(t => t.id != id);
    save(d);
  },

  // Clients
  getClients() { return load().clients.slice().reverse(); },
  getActiveClients() { return load().clients.filter(c => c.active); },
  addClient(name, phone, cpf, interval_hours) {
    const d = load();
    d.clients.push({ id: d._nextId.clients++, name, phone, cpf: cpf || '', interval_hours, active: 1, last_sent: 0, created_at: nowTs() });
    save(d);
  },
  removeClient(id) {
    const d = load();
    const c = d.clients.find(c => c.id == id);
    if (c) c.active = 0;
    save(d);
  },
  updateLastSent(id) {
    const d = load();
    const c = d.clients.find(c => c.id == id);
    if (c) c.last_sent = nowTs();
    save(d);
  },
  deleteClient(id) {
    const d = load();
    d.clients = d.clients.filter(c => c.id != id);
    save(d);
  },

  // Logs
  addLog(data) {
    const d = load();
    d.logs.push({ id: d._nextId.logs++, ...data, sent_at: nowTs() });
    // Manter apenas os últimos 500 logs
    if (d.logs.length > 500) d.logs = d.logs.slice(-500);
    save(d);
  },
  getLogs(limit = 100) {
    return load().logs.slice().reverse().slice(0, limit);
  },
};
