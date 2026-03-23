const axios = require('axios');
const db = require('./db');

/**
 * Envia mensagem de texto via Evolution API
 */
async function sendTextMessage(instance, phone, text) {
  const evolutionUrl = db.getSetting('evolution_url');
  const apiKey = db.getSetting('evolution_apikey');

  if (!evolutionUrl || !apiKey) {
    throw new Error('Evolution API não configurada. Vá em Configurações e informe a URL e API Key.');
  }

  // Formatar número: garantir código do país 55 (Brasil)
  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;

  // URL encode o nome da instância (suporta espaços e caracteres especiais)
  const url = `${evolutionUrl.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(instance)}`;

  const response = await axios.post(url, {
    number: cleanPhone,
    text: text,
  }, {
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  return response.data;
}

/**
 * Verifica status de uma instância
 */
async function checkInstance(instance) {
  const evolutionUrl = db.getSetting('evolution_url');
  const apiKey = db.getSetting('evolution_apikey');

  const url = `${evolutionUrl.replace(/\/$/, '')}/instance/connectionState/${encodeURIComponent(instance)}`;
  const response = await axios.get(url, {
    headers: { 'apikey': apiKey },
    timeout: 8000,
  });
  return response.data;
}

/**
 * Cria nova instância na Evolution API
 */
async function createInstance(instance_name) {
  const evolutionUrl = db.getSetting('evolution_url');
  const apiKey = db.getSetting('evolution_apikey');

  const url = `${evolutionUrl.replace(/\/$/, '')}/instance/create`;
  const response = await axios.post(url, {
    instanceName: instance_name,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  }, {
    headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return response.data;
}

/**
 * Busca QR code de uma instância
 */
async function getQrCode(instance) {
  const evolutionUrl = db.getSetting('evolution_url');
  const apiKey = db.getSetting('evolution_apikey');

  const url = `${evolutionUrl.replace(/\/$/, '')}/instance/connect/${encodeURIComponent(instance)}`;
  const response = await axios.get(url, {
    headers: { 'apikey': apiKey },
    timeout: 10000,
  });
  return response.data;
}

/**
 * Deleta instância na Evolution API
 */
async function deleteEvolutionInstance(instance) {
  const evolutionUrl = db.getSetting('evolution_url');
  const apiKey = db.getSetting('evolution_apikey');

  const url = `${evolutionUrl.replace(/\/$/, '')}/instance/delete/${encodeURIComponent(instance)}`;
  const response = await axios.delete(url, {
    headers: { 'apikey': apiKey },
    timeout: 10000,
  });
  return response.data;
}

module.exports = { sendTextMessage, checkInstance, createInstance, getQrCode, deleteEvolutionInstance };
