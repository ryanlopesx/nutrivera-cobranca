const http = require('http');

const senders = [
  { label: '1906 - Julia Donatelli', instance_name: '1906' },
  { label: '8301 - Dr Saulo Borges', instance_name: '8301' },
  { label: '3766 - Julia Donatelli', instance_name: '3766' },
  { label: '9857 - Julia Donatelli', instance_name: '9857' },
  { label: 'ADV - Horlando Advocacia', instance_name: 'ADV' },
  { label: '3903 - Nutrix Lab', instance_name: '3903' },
  { label: '4039 - Julia Donatelli', instance_name: '4039' },
  { label: '4578 - Katia Juridico', instance_name: '4578' },
  { label: '9706 - Julia Donatelli', instance_name: '9706' },
  { label: '6628 - Julia Donatelli', instance_name: '6628' },
  { label: '0797 - Dr Saulo Borges', instance_name: '0797' },
];

function post(sender) {
  return new Promise((resolve) => {
    const body = JSON.stringify(sender);
    const req = http.request({
      hostname: 'localhost', port: 3001, path: '/api/senders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        console.log(`${res.statusCode === 200 ? 'OK' : 'ERRO'}: ${sender.instance_name} - ${data}`);
        resolve();
      });
    });
    req.on('error', e => { console.log(`ERRO: ${sender.instance_name} - ${e.message}`); resolve(); });
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const s of senders) await post(s);
  console.log('\nPronto!');
  process.exit(0);
})();
