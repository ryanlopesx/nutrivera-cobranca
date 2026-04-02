const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS senders (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      instance_name TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at INTEGER
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at INTEGER
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      cpf TEXT DEFAULT '',
      interval_hours FLOAT DEFAULT 2,
      active INTEGER DEFAULT 1,
      last_sent INTEGER DEFAULT 0,
      created_at INTEGER
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      client_id INTEGER,
      client_name TEXT,
      client_phone TEXT,
      sender_instance TEXT,
      template_text TEXT,
      status TEXT,
      error TEXT,
      sent_at INTEGER
    )
  `);

  // Seed settings padrão
  await query(`
    INSERT INTO settings (key, value) VALUES
      ('evolution_url', $1), ('evolution_apikey', $2)
    ON CONFLICT (key) DO NOTHING
  `, [
    process.env.EVOLUTION_URL || 'http://localhost:8080',
    process.env.EVOLUTION_APIKEY || '',
  ]);

  // Seed templates padrão se não existir nenhum
  const { rows } = await query('SELECT COUNT(*) as c FROM templates');
  if (parseInt(rows[0].c) === 0) {
    const now = Math.floor(Date.now() / 1000);
    const templates = [
      'Este contato refere-se a uma pendência financeira vinculada a um pedido do Erecton Men já entregue e confirmado.\nÉ necessário retorno imediato para regularização do pagamento. 📞+5511959777425',
      'Identificamos pendência de pagamento referente a pedido do Erecton Men devidamente entregue.\nSolicitamos retorno para regularização. 📞+5511959777425',
      'Pedido do Erecton Men entregue e confirmado permanece com pagamento em aberto.\nÉ necessário retorno para regularização. 📞+5511959777425',
      'Consta em sistema pedido do Erecton Men entregue com pendência financeira ativa.\nFavor retornar para regularização. 📞+5511959777425',
      'Referente ao Erecton Men: pedido entregue e pagamento não identificado até o momento.\nNecessário retorno imediato. 📞+5511959777425',
      'Pedido do Erecton Men foi entregue conforme contratado e segue com pendência de pagamento.\nAguardamos retorno para regularização. 📞+5511959777425',
      'Pendência financeira identificada referente a pedido do Erecton Men já entregue.\nRetorno necessário para regularização. 📞+5511959777425',
      'Pedido do Erecton Men entregue e confirmado permanece sem quitação.\nSolicitamos retorno imediato. 📞+5511959777425',
      'Registro de entrega do Erecton Men consta confirmado, porém sem pagamento.\nNecessária regularização imediata. 📞+5511959777425',
      'Pedido do Erecton Men foi devidamente entregue e permanece com pendência financeira.\nRetorne para regularização. 📞+5511959777425',
      'Consta em sistema entrega confirmada do Erecton Men com pagamento pendente.\nFavor retornar para regularização. 📞+5511959777425',
      'Pedido do Erecton Men entregue conforme contratação segue sem pagamento registrado.\nNecessário retorno imediato. 📞+5511959777425',
      'Pendência referente ao Erecton Men permanece ativa após confirmação de entrega.\nAguardamos retorno para regularização. 📞+5511959777425',
      'Pedido do Erecton Men entregue e vinculado a pagamento ainda não realizado.\nRetorne para regularização. 📞+5511959777425',
      'Entrega do Erecton Men confirmada e pagamento não identificado.\nRegularização necessária. 📞+5511959777425',
      'Pendência financeira ativa referente a pedido do Erecton Men já entregue.\nFavor retornar imediatamente. 📞+5511959777425',
      'Pedido do Erecton Men entregue e confirmado permanece sem regularização de pagamento.\nRetorno necessário. 📞+5511959777425',
      'Consta entrega do Erecton Men e ausência de quitação até o momento.\nNecessária regularização imediata. 📞+5511959777425',
      'Pedido do Erecton Men foi entregue e segue com pagamento em aberto.\nAguardamos retorno para regularização. 📞+5511959777425',
      'Registro de entrega do Erecton Men confirmado, com pendência financeira ativa.\nFavor retornar. 📞+5511959777425',
      'Pedido do Erecton Men entregue conforme contratado permanece sem pagamento.\nNecessária regularização. 📞+5511959777425',
      'Pendência identificada referente a pedido do Erecton Men já entregue.\nRetorne para regularização. 📞+5511959777425',
      'Consta entrega confirmada do Erecton Men e ausência de pagamento.\nRegularização necessária. 📞+5511959777425',
      'Pedido do Erecton Men entregue e vinculado a pendência financeira ativa.\nSolicitamos retorno imediato. 📞+5511959777425',
      'Entrega do Erecton Men confirmada em sistema com pagamento não realizado.\nFavor retornar. 📞+5511959777425',
      'Pedido do Erecton Men já entregue permanece com pendência de pagamento.\nNecessária regularização. 📞+5511959777425',
      'Consta em sistema entrega do Erecton Men com pagamento em aberto.\nRetorno necessário. 📞+5511959777425',
      'Pendência financeira referente ao Erecton Men permanece ativa após entrega confirmada.\nAguardamos retorno. 📞+5511959777425',
      'Pedido do Erecton Men entregue conforme registro permanece sem quitação.\nRegularização necessária. 📞+5511959777425',
      'Identificada pendência de pagamento referente ao Erecton Men já entregue.\nSolicitamos retorno imediato para regularização. 📞+5511959777425',
    ];
    for (const text of templates) {
      await query('INSERT INTO templates (text, active, created_at) VALUES ($1, 1, $2)', [text, now]);
    }
  }

  // Seed remetentes padrão via env var (ex: DEFAULT_SENDERS=A1,A2,A3)
  if (process.env.DEFAULT_SENDERS) {
    const names = process.env.DEFAULT_SENDERS.split(',').map(s => s.trim()).filter(Boolean);
    const now = Math.floor(Date.now() / 1000);
    for (const name of names) {
      await query(
        'INSERT INTO senders (label, instance_name, phone, active, created_at) VALUES ($1, $2, $3, 1, $4) ON CONFLICT (instance_name) DO NOTHING',
        [name, name, '', now]
      );
    }
  }

  console.log('[DB] PostgreSQL conectado e tabelas prontas');
}

function nowTs() { return Math.floor(Date.now() / 1000); }

module.exports = {
  init,

  // Settings
  async getSetting(key) {
    // Prioridade: env var
    if (key === 'evolution_url' && process.env.EVOLUTION_URL) return process.env.EVOLUTION_URL;
    if (key === 'evolution_apikey' && process.env.EVOLUTION_APIKEY) return process.env.EVOLUTION_APIKEY;
    const { rows } = await query('SELECT value FROM settings WHERE key = $1', [key]);
    return rows[0]?.value || '';
  },
  async setSetting(key, value) {
    await query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value]);
  },
  async getAllSettings() {
    const { rows } = await query('SELECT key, value FROM settings');
    return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
  },

  // Senders
  async getSenders() {
    const { rows } = await query('SELECT * FROM senders ORDER BY id DESC');
    return rows;
  },
  async getActiveSenders() {
    const { rows } = await query('SELECT * FROM senders WHERE active = 1');
    return rows;
  },
  async addSender(label, instance_name, phone = '') {
    await query(
      'INSERT INTO senders (label, instance_name, phone, active, created_at) VALUES ($1, $2, $3, 1, $4)',
      [label, instance_name, phone, nowTs()]
    );
  },
  async toggleSender(id, active) {
    await query('UPDATE senders SET active = $1 WHERE id = $2', [active, id]);
  },
  async deleteSender(id) {
    await query('DELETE FROM senders WHERE id = $1', [id]);
  },

  // Templates
  async getTemplates() {
    const { rows } = await query('SELECT * FROM templates ORDER BY id DESC');
    return rows;
  },
  async getActiveTemplates() {
    const { rows } = await query('SELECT * FROM templates WHERE active = 1');
    return rows;
  },
  async addTemplate(text) {
    await query('INSERT INTO templates (text, active, created_at) VALUES ($1, 1, $2)', [text, nowTs()]);
  },
  async toggleTemplate(id, active) {
    await query('UPDATE templates SET active = $1 WHERE id = $2', [active, id]);
  },
  async deleteTemplate(id) {
    await query('DELETE FROM templates WHERE id = $1', [id]);
  },

  // Clients
  async getClients() {
    const { rows } = await query('SELECT * FROM clients ORDER BY id DESC');
    return rows;
  },
  async getActiveClients() {
    const { rows } = await query('SELECT * FROM clients WHERE active = 1');
    return rows;
  },
  async addClient(name, phone, cpf, interval_hours) {
    await query(
      'INSERT INTO clients (name, phone, cpf, interval_hours, active, last_sent, created_at) VALUES ($1, $2, $3, $4, 1, 0, $5)',
      [name, phone, cpf || '', interval_hours, nowTs()]
    );
  },
  async removeClient(id) {
    await query('UPDATE clients SET active = 0 WHERE id = $1', [id]);
  },
  async updateLastSent(id) {
    await query('UPDATE clients SET last_sent = $1 WHERE id = $2', [nowTs(), id]);
  },
  async deleteClient(id) {
    await query('DELETE FROM clients WHERE id = $1', [id]);
  },

  // Logs
  async addLog(data) {
    await query(
      'INSERT INTO logs (client_id, client_name, client_phone, sender_instance, template_text, status, error, sent_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [data.client_id, data.client_name, data.client_phone, data.sender_instance, data.template_text, data.status, data.error || null, nowTs()]
    );
    // Manter apenas os últimos 500 logs
    await query('DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT 500)');
  },
  async getLogs(limit = 100) {
    const { rows } = await query('SELECT * FROM logs ORDER BY id DESC LIMIT $1', [limit]);
    return rows;
  },
};
