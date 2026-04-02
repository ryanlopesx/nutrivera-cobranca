const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const db = require('./db');
const { checkInstance, createInstance, getQrCode, deleteEvolutionInstance, sendTextMessage } = require('./evolution');
const scheduler = require('./scheduler');

function getEvolutionConfig() {
  return {
    evolutionUrl: (process.env.EVOLUTION_URL || db.getSetting('evolution_url') || '').replace(/\/$/, ''),
    apiKey: process.env.EVOLUTION_APIKEY || db.getSetting('evolution_apikey') || '',
  };
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── SETTINGS ───────────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  res.json(db.getAllSettings());
});

app.post('/api/settings', (req, res) => {
  const { evolution_url, evolution_apikey } = req.body;
  if (evolution_url !== undefined) db.setSetting('evolution_url', evolution_url.trim());
  if (evolution_apikey !== undefined) db.setSetting('evolution_apikey', evolution_apikey.trim());
  res.json({ ok: true });
});

// ─── SENDERS ────────────────────────────────────────────────────────────────

app.get('/api/senders', (req, res) => {
  res.json(db.getSenders());
});

app.post('/api/senders', (req, res) => {
  const { label, instance_name } = req.body;
  if (!label || !instance_name) return res.status(400).json({ error: 'label e instance_name são obrigatórios' });
  try {
    db.addSender(label.trim(), instance_name.trim());
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'instance_name já cadastrado' });
  }
});

app.patch('/api/senders/:id/toggle', (req, res) => {
  const { active } = req.body;
  db.toggleSender(req.params.id, active ? 1 : 0);
  res.json({ ok: true });
});

app.delete('/api/senders/:id', (req, res) => {
  db.deleteSender(req.params.id);
  res.json({ ok: true });
});

app.get('/api/senders/:instance/status', async (req, res) => {
  try {
    const status = await checkInstance(req.params.instance);
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Criar nova instância na Evolution e cadastrar como remetente
app.post('/api/senders/create', async (req, res) => {
  const { label, instance_name, phone } = req.body;
  if (!label || !instance_name) return res.status(400).json({ error: 'label e instance_name são obrigatórios' });

  try {
    const result = await createInstance(instance_name.trim());
    const cleanPhone = (phone || '').replace(/\D/g, '');
    db.addSender(label.trim(), instance_name.trim(), cleanPhone);
    res.json({ ok: true, qrcode: result.qrcode || null, base64: result.base64 || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Buscar QR code de uma instância já criada
app.get('/api/senders/:instance/qrcode', async (req, res) => {
  try {
    const qr = await getQrCode(req.params.instance);
    res.json(qr);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Deletar instância da Evolution e remover do sistema
app.delete('/api/senders/:id/full', async (req, res) => {
  const senders = db.getSenders();
  const sender = senders.find(s => s.id == req.params.id);
  if (!sender) return res.status(404).json({ error: 'Não encontrado' });

  try {
    await deleteEvolutionInstance(sender.instance_name);
  } catch (e) {
    console.warn(`Aviso ao deletar instância ${sender.instance_name} na Evolution:`, e.message);
  }
  db.deleteSender(req.params.id);
  res.json({ ok: true });
});

// ─── TEMPLATES ──────────────────────────────────────────────────────────────

app.get('/api/templates', (req, res) => {
  res.json(db.getTemplates());
});

app.post('/api/templates', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Texto é obrigatório' });
  db.addTemplate(text.trim());
  res.json({ ok: true });
});

app.patch('/api/templates/:id/toggle', (req, res) => {
  const { active } = req.body;
  db.toggleTemplate(req.params.id, active ? 1 : 0);
  res.json({ ok: true });
});

app.delete('/api/templates/:id', (req, res) => {
  db.deleteTemplate(req.params.id);
  res.json({ ok: true });
});

// ─── CLIENTS ────────────────────────────────────────────────────────────────

app.get('/api/clients', (req, res) => {
  res.json(db.getClients());
});

app.post('/api/clients', (req, res) => {
  const { name, phone, cpf, interval_hours } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });

  const hours = parseFloat(interval_hours) || 2;
  if (hours <= 0) return res.status(400).json({ error: 'Intervalo deve ser maior que 0' });

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 13) return res.status(400).json({ error: 'Telefone inválido. Use DDD + número (ex: 27999999999).' });

  const cleanCpf = (cpf || '').replace(/\D/g, '');
  db.addClient(name.trim(), cleanPhone, cleanCpf, hours);
  res.json({ ok: true });
});

app.patch('/api/clients/:id/remove', (req, res) => {
  db.removeClient(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/clients/:id', (req, res) => {
  db.deleteClient(req.params.id);
  res.json({ ok: true });
});

app.post('/api/clients/import', (req, res) => {
  const { clients, interval_hours } = req.body;
  if (!Array.isArray(clients) || clients.length === 0) {
    return res.status(400).json({ error: 'Lista de clientes vazia ou inválida' });
  }
  const hours = parseFloat(interval_hours) || 2;
  if (hours <= 0) return res.status(400).json({ error: 'Intervalo deve ser maior que 0' });

  let imported = 0;
  const errors = [];

  clients.forEach((c, i) => {
    const name = (c.name || '').trim();
    const phone = (c.phone || '').replace(/\D/g, '');
    const cpf = (c.cpf || '').replace(/\D/g, '');

    if (!name || !phone) { errors.push(`Linha ${i + 1}: nome e telefone obrigatórios`); return; }
    if (phone.length < 10 || phone.length > 13) { errors.push(`Linha ${i + 1}: telefone inválido (${phone})`); return; }

    try {
      db.addClient(name, phone, cpf, hours);
      imported++;
    } catch (e) {
      errors.push(`Linha ${i + 1}: ${e.message}`);
    }
  });

  res.json({ ok: true, imported, errors });
});

// ─── LOGS ───────────────────────────────────────────────────────────────────

app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(db.getLogs(limit));
});

// ─── STATUS DO SCHEDULER ────────────────────────────────────────────────────

app.get('/api/status', (req, res) => {
  const clients = db.getActiveClients();
  const senders = db.getActiveSenders();
  const templates = db.getActiveTemplates();
  res.json({
    active_clients: clients.length,
    active_senders: senders.length,
    active_templates: templates.length,
    scheduler: 'rodando',
  });
});

// ─── CHAT ────────────────────────────────────────────────────────────────────

app.get('/api/chat/conversations', async (req, res) => {
  const { instance } = req.query;
  if (!instance) return res.status(400).json({ error: 'instance obrigatório' });
  try {
    const { evolutionUrl, apiKey } = getEvolutionConfig();
    const url = `${evolutionUrl}/chat/findChats/${encodeURIComponent(instance)}`;
    const response = await axios.get(url, { headers: { 'apikey': apiKey }, timeout: 15000 });
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

app.get('/api/chat/messages', async (req, res) => {
  const { instance, phone } = req.query;
  if (!instance || !phone) return res.status(400).json({ error: 'instance e phone obrigatórios' });
  try {
    const { evolutionUrl, apiKey } = getEvolutionConfig();
    const url = `${evolutionUrl}/chat/findMessages/${encodeURIComponent(instance)}`;
    const response = await axios.post(url, {
      where: { key: { remoteJid: `${phone}@s.whatsapp.net` } },
      limit: 50,
    }, { headers: { 'apikey': apiKey, 'Content-Type': 'application/json' }, timeout: 15000 });
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

app.post('/api/chat/send', async (req, res) => {
  const { instance, phone, text } = req.body;
  if (!instance || !phone || !text) return res.status(400).json({ error: 'instance, phone e text obrigatórios' });
  try {
    const result = await sendTextMessage(instance, phone, text);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CATCH ALL ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar
app.listen(PORT, () => {
  console.log(`\n🚀 Sistema de Cobrança rodando em http://localhost:${PORT}\n`);

  // Cadastrar remetentes padrão via env var (ex: DEFAULT_SENDERS=A1,A2,A3)
  if (process.env.DEFAULT_SENDERS) {
    const names = process.env.DEFAULT_SENDERS.split(',').map(s => s.trim()).filter(Boolean);
    names.forEach(name => {
      try { db.addSender(name, name); console.log(`Remetente cadastrado: ${name}`); } catch (e) {}
    });
  }

  scheduler.start();
});
