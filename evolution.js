const axios = require('axios');
const db = require('./db');

function getConfig() {
  return {
    evolutionUrl: (process.env.EVOLUTION_URL || db.getSetting('evolution_url') || '').replace(/\/$/, ''),
    apiKey: process.env.EVOLUTION_APIKEY || db.getSetting('evolution_apikey') || '',
  };
}

/**
 * Envia mensagem de texto via Evolution API
 */
async function sendTextMessage(instance, phone, text) {
  const { evolutionUrl, apiKey } = getConfig();
  if (!evolutionUrl || !apiKey) throw new Error('Evolution API não configurada.');

  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;

  const url = `${evolutionUrl}/message/sendText/${encodeURIComponent(instance)}`;
  const response = await axios.post(url, { number: cleanPhone, text }, {
    headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return response.data;
}

async function checkInstance(instance) {
  const { evolutionUrl, apiKey } = getConfig();
  const url = `${evolutionUrl}/instance/connectionState/${encodeURIComponent(instance)}`;
  const response = await axios.get(url, { headers: { 'apikey': apiKey }, timeout: 8000 });
  return response.data;
}

async function createInstance(instance_name) {
  const { evolutionUrl, apiKey } = getConfig();
  const url = `${evolutionUrl}/instance/create`;
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

async function getQrCode(instance) {
  const { evolutionUrl, apiKey } = getConfig();
  const url = `${evolutionUrl}/instance/connect/${encodeURIComponent(instance)}`;
  const response = await axios.get(url, { headers: { 'apikey': apiKey }, timeout: 10000 });
  return response.data;
}

async function deleteEvolutionInstance(instance) {
  const { evolutionUrl, apiKey } = getConfig();
  const url = `${evolutionUrl}/instance/delete/${encodeURIComponent(instance)}`;
  const response = await axios.delete(url, { headers: { 'apikey': apiKey }, timeout: 10000 });
  return response.data;
}

module.exports = { sendTextMessage, checkInstance, createInstance, getQrCode, deleteEvolutionInstance };
