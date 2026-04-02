const db = require('./db');
const { sendTextMessage } = require('./evolution');

let schedulerInterval = null;
let isRunning = false;

/**
 * Seleciona item aleatório de um array
 */
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Substitui placeholders no template
 */
function buildMessage(template, client) {
  return template.text
    .replace(/\{nome\}/gi, client.name)
    .replace(/\{cpf\}/gi, client.cpf || '')
    .replace(/\{phone\}/gi, client.phone);
}

/**
 * Processa envios pendentes
 */
async function processPending() {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = Math.floor(Date.now() / 1000);
    const clients = await db.getActiveClients();
    const senders = await db.getActiveSenders();
    const templates = await db.getActiveTemplates();

    if (senders.length === 0 || templates.length === 0) {
      isRunning = false;
      return;
    }

    for (const client of clients) {
      const intervalSecs = Math.floor(client.interval_hours * 3600);
      const nextSendAt = client.last_sent + intervalSecs;

      if (now >= nextSendAt) {
        // Escolhe remetente e template aleatórios
        const sender = randomItem(senders);
        const template = randomItem(templates);
        const text = buildMessage(template, client);

        console.log(`[Scheduler] Enviando para ${client.name} (${client.phone}) via instância ${sender.instance_name}`);

        try {
          await sendTextMessage(sender.instance_name, client.phone, text);

          await db.updateLastSent(client.id);
          await db.addLog({
            client_id: client.id,
            client_name: client.name,
            client_phone: client.phone,
            sender_instance: sender.instance_name,
            template_text: text,
            status: 'enviado',
          });

          console.log(`[Scheduler] ✓ Enviado com sucesso para ${client.name}`);
        } catch (err) {
          console.error(`[Scheduler] ✗ Erro ao enviar para ${client.name}: ${err.message}`);
          await db.addLog({
            client_id: client.id,
            client_name: client.name,
            client_phone: client.phone,
            sender_instance: sender.instance_name,
            template_text: text,
            status: 'erro',
            error: err.message,
          });
        }

        // Pequena pausa entre envios para evitar rate limit
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro geral:', err.message);
  }

  isRunning = false;
}

/**
 * Inicia o scheduler (verifica a cada 60 segundos)
 */
function start() {
  if (schedulerInterval) return;
  console.log('[Scheduler] Iniciado - verificando a cada 60 segundos');

  // Primeira execução imediata
  processPending();

  // Intervalo de 60 em 60 segundos
  schedulerInterval = setInterval(processPending, 60 * 1000);
}

/**
 * Para o scheduler
 */
function stop() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Parado');
  }
}

module.exports = { start, stop };
