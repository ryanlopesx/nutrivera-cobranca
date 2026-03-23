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
      '⚠️ AVISO IMPORTANTE — {nome}, seu CPF será negativado no Serasa e SPC nas próximas 48 horas referente ao débito com a Nutrivera. Para evitar restrições no seu nome, regularize AGORA. Responda esta mensagem.',
      '🔴 {nome}, comunicamos que o seu débito com a Nutrivera está prestes a ser encaminhado ao Serasa. A negativação do seu CPF pode impedir financiamentos, cartões e crédito. Evite isso — entre em contato imediatamente.',
      '❗ {nome}, última oportunidade antes da negativação. Seu nome será incluído no Serasa e SPC por débito em aberto com a Nutrivera. Regularize hoje e evite prejuízos maiores. Fale conosco agora.',
      '⚠️ Nutrivera Cobranças — {nome}, informamos que seu CPF está em processo de negativação no Serasa por falta de pagamento. Após a negativação, seu score de crédito será afetado. Regularize antes que seja tarde.',
      '🚨 {nome}, seu débito com a Nutrivera foi encaminhado ao setor jurídico. Caso não haja pagamento em 24h, seu CPF será negativado no Serasa, SPC e Boa Vista. Não ignore este aviso. Responda agora para negociar.',
      '❌ DÉBITO EM ABERTO — {nome}, a Nutrivera informa que seu valor encontra-se vencido. Seu CPF será protestado e negativado nos órgãos de proteção ao crédito. Entre em contato URGENTE para evitar maiores consequências.',
      '⚠️ {nome}, este é um aviso formal da Nutrivera. Seu débito não foi quitado e seu nome será negativado no Serasa em breve. A negativação fica registrada por até 5 anos. Regularize agora antes que isso aconteça.',
      '🔴 ATENÇÃO {nome} — Nutrivera Cobranças. Você possui débito em aberto. Estamos comunicando que o processo de negativação do seu CPF no Serasa já foi iniciado. Para cancelar, efetue o pagamento e nos envie o comprovante.',
      '❗ {nome}, a Nutrivera já protocolou a negativação do seu CPF junto ao Serasa. Você tem até hoje para regularizar e cancelar o processo. Após esse prazo não será possível reverter. Fale conosco agora mesmo.',
      '🚨 Nutrivera — {nome}, comunicamos que seu débito foi registrado para negativação. Seu CPF constará no Serasa, impedindo acesso a crédito, financiamentos e abertura de contas. Para cancelar regularize agora.',
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
  addClient(name, phone, interval_hours) {
    const d = load();
    d.clients.push({ id: d._nextId.clients++, name, phone, interval_hours, active: 1, last_sent: 0, created_at: nowTs() });
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
