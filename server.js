const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const db = require('./db');
const { sendTextMessage, checkInstance, createInstance, getQrCode, deleteEvolutionInstance } = require('./evolution');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── SETTINGS ───────────────────────────────────────────────────────────────

app.get('/api/settings', async (req, res) => {
  res.json(await db.getAllSettings());
});

app.post('/api/settings', async (req, res) => {
  const { evolution_url, evolution_apikey } = req.body;
  if (evolution_url !== undefined) await db.setSetting('evolution_url', evolution_url.trim());
  if (evolution_apikey !== undefined) await db.setSetting('evolution_apikey', evolution_apikey.trim());
  res.json({ ok: true });
});

// ─── SENDERS ────────────────────────────────────────────────────────────────

app.get('/api/senders', async (req, res) => {
  res.json(await db.getSenders());
});

app.post('/api/senders', async (req, res) => {
  const { label, instance_name } = req.body;
  if (!label || !instance_name) return res.status(400).json({ error: 'label e instance_name são obrigatórios' });
  try {
    await db.addSender(label.trim(), instance_name.trim());
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'instance_name já cadastrado' });
  }
});

app.patch('/api/senders/:id/toggle', async (req, res) => {
  const { active } = req.body;
  await db.toggleSender(req.params.id, active ? 1 : 0);
  res.json({ ok: true });
});

app.delete('/api/senders/:id', async (req, res) => {
  await db.deleteSender(req.params.id);
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

app.post('/api/senders/create', async (req, res) => {
  const { label, instance_name, phone } = req.body;
  if (!label || !instance_name) return res.status(400).json({ error: 'label e instance_name são obrigatórios' });
  try {
    const result = await createInstance(instance_name.trim());
    const cleanPhone = (phone || '').replace(/\D/g, '');
    await db.addSender(label.trim(), instance_name.trim(), cleanPhone);
    res.json({ ok: true, qrcode: result.qrcode || null, base64: result.base64 || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/senders/:instance/qrcode', async (req, res) => {
  try {
    const qr = await getQrCode(req.params.instance);
    res.json(qr);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/senders/:id/full', async (req, res) => {
  const senders = await db.getSenders();
  const sender = senders.find(s => s.id == req.params.id);
  if (!sender) return res.status(404).json({ error: 'Não encontrado' });
  try {
    await deleteEvolutionInstance(sender.instance_name);
  } catch (e) {
    console.warn(`Aviso ao deletar instância ${sender.instance_name}:`, e.message);
  }
  await db.deleteSender(req.params.id);
  res.json({ ok: true });
});

// ─── TEMPLATES ──────────────────────────────────────────────────────────────

app.get('/api/templates', async (req, res) => {
  res.json(await db.getTemplates());
});

app.post('/api/templates', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Texto é obrigatório' });
  await db.addTemplate(text.trim());
  res.json({ ok: true });
});

app.patch('/api/templates/:id/toggle', async (req, res) => {
  const { active } = req.body;
  await db.toggleTemplate(req.params.id, active ? 1 : 0);
  res.json({ ok: true });
});

app.delete('/api/templates/:id', async (req, res) => {
  await db.deleteTemplate(req.params.id);
  res.json({ ok: true });
});

// ─── CLIENTS ────────────────────────────────────────────────────────────────

app.get('/api/clients', async (req, res) => {
  res.json(await db.getClients());
});

app.post('/api/clients', async (req, res) => {
  const { name, phone, cpf, interval_hours } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
  const hours = parseFloat(interval_hours) || 2;
  if (hours <= 0) return res.status(400).json({ error: 'Intervalo deve ser maior que 0' });
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 13) return res.status(400).json({ error: 'Telefone inválido.' });
  const cleanCpf = (cpf || '').replace(/\D/g, '');
  await db.addClient(name.trim(), cleanPhone, cleanCpf, hours);
  res.json({ ok: true });
});

app.post('/api/clients/import', async (req, res) => {
  const { clients, interval_hours } = req.body;
  if (!Array.isArray(clients)) return res.status(400).json({ error: 'clients deve ser um array' });
  const hours = parseFloat(interval_hours) || 2;
  let imported = 0;
  const errors = [];
  for (const c of clients) {
    const phone = (c.phone || '').replace(/\D/g, '');
    if (!c.name || phone.length < 10) { errors.push(`Inválido: ${c.name || '?'}`); continue; }
    try {
      await db.addClient(c.name.trim(), phone, (c.cpf || '').replace(/\D/g, ''), hours);
      imported++;
    } catch (e) { errors.push(c.name); }
  }
  res.json({ ok: true, imported, errors });
});

app.patch('/api/clients/:id/remove', async (req, res) => {
  await db.removeClient(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/clients/:id', async (req, res) => {
  await db.deleteClient(req.params.id);
  res.json({ ok: true });
});

// ─── LOGS ───────────────────────────────────────────────────────────────────

app.get('/api/logs', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(await db.getLogs(limit));
});

// ─── STATUS ─────────────────────────────────────────────────────────────────

app.get('/api/status', async (req, res) => {
  const [clients, senders, templates] = await Promise.all([
    db.getActiveClients(), db.getActiveSenders(), db.getActiveTemplates(),
  ]);
  res.json({ active_clients: clients.length, active_senders: senders.length, active_templates: templates.length, scheduler: 'rodando' });
});

// ─── CHAT ───────────────────────────────────────────────────────────────────

function getEvolutionConfig() {
  return {
    url: (process.env.EVOLUTION_URL || '').replace(/\/$/, ''),
    key: process.env.EVOLUTION_APIKEY || '',
  };
}

app.get('/api/chat/conversations', async (req, res) => {
  try {
    const { url, key } = getEvolutionConfig();
    const headers = { apikey: key, 'Content-Type': 'application/json' };

    // Busca todas as instâncias ativas
    const senders = await db.getActiveSenders();
    const clients = await db.getClients();

    // Busca conversas de todas as instâncias em paralelo
    const results = await Promise.allSettled(
      senders.map(sender =>
        axios.post(`${url}/chat/findChats/${encodeURIComponent(sender.instance_name)}`,
          { where: {}, limit: 100 },
          { headers, timeout: 10000 }
        ).then(r => ({ sender, chats: Array.isArray(r.data) ? r.data : [] }))
      )
    );

    // Agrega tudo em um mapa por telefone (evita duplicatas)
    const map = new Map();
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const { sender, chats } = result.value;
      for (const chat of chats) {
        if (!chat.remoteJid || chat.remoteJid.includes('@g.us')) continue;
        const phone = chat.remoteJid.replace('@s.whatsapp.net', '');
        if (map.has(phone)) continue; // já tem essa conversa

        const client = clients.find(c => {
          const cp = c.phone.replace(/\D/g, '');
          const p = phone.replace(/\D/g, '');
          return cp === p || cp === p.replace(/^55/, '') || ('55' + cp) === p;
        });

        map.set(phone, {
          ...chat,
          phone,
          instance: sender.instance_name,
          clientName: client?.name || chat.pushName || null,
        });
      }
    }

    // Ordena por data da última mensagem (mais recente primeiro)
    const all = Array.from(map.values()).sort((a, b) => {
      const ta = new Date(a.updatedAt || 0).getTime();
      const tb = new Date(b.updatedAt || 0).getTime();
      return tb - ta;
    });

    res.json(all);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/chat/messages', async (req, res) => {
  const { instance, phone } = req.query;
  if (!instance || !phone) return res.status(400).json({ error: 'instance e phone obrigatórios' });
  try {
    const { url, key } = getEvolutionConfig();
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;
    const jid = `${cleanPhone}@s.whatsapp.net`;
    const r = await axios.post(`${url}/chat/findMessages/${encodeURIComponent(instance)}`,
      { where: { key: { remoteJid: jid } }, limit: 50 },
      { headers: { apikey: key, 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    // Normaliza: suporta array direto ou { messages: { records: [] } }
    const raw = r.data;
    const records = Array.isArray(raw) ? raw
      : Array.isArray(raw?.messages?.records) ? raw.messages.records
      : Array.isArray(raw?.records) ? raw.records : [];
    res.json(records);
  } catch (e) {
    res.status(500).json({ error: e.message });
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

// ─── INICIAR ────────────────────────────────────────────────────────────────

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`\nSistema de Cobrança rodando em http://localhost:${PORT}\n`);
    scheduler.start();
  });
}).catch(err => {
  console.error('Erro ao conectar no banco:', err.message);
  process.exit(1);
});
