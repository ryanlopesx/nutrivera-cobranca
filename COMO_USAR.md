# Sistema de Cobrança Automática - Evolution API

## Instalação

### 1. Instalar Node.js
Baixe em: https://nodejs.org (versão LTS recomendada)

### 2. Instalar dependências do projeto
Abra o CMD ou PowerShell na pasta do projeto e execute:
```
npm install
```

### 3. Iniciar o sistema
```
npm start
```

### 4. Acessar a interface
Abra no navegador: http://localhost:3000

---

## Como configurar

### Configurações (aba ⚙️)
1. Informe a **URL da Evolution API** (ex: `http://localhost:8080` ou a URL do seu servidor)
2. Informe a **API Key** do seu servidor Evolution
3. Clique em **Salvar**

### Remetentes (aba 📱)
- Adicione as instâncias do Evolution que irão **enviar** as mensagens
- Cada instância é um número de WhatsApp conectado
- O sistema sorteia aleatoriamente qual número vai enviar cada mensagem
- Exemplo: você tem 10 instâncias → o sistema rotaciona entre elas

### Mensagens (aba 💬)
- Adicione múltiplas variações de mensagens de cobrança
- Use `{nome}` no texto → será substituído pelo nome do cliente
- O sistema sorteia uma mensagem diferente a cada envio
- Já vem com 6 templates de exemplo

### Clientes (aba 👥)
- Adicione os clientes que estão com pagamento pendente
- Informe: **Nome**, **Telefone com DDD** (ex: 11999999999), **Intervalo em horas**
- O sistema começa a enviar mensagens automaticamente no intervalo configurado
- Para parar, clique em **Remover** (o cliente fica na lista como removido)

---

## Como funciona o agendamento

- O sistema verifica a cada **60 segundos** quem precisa receber mensagem
- Quando um cliente é adicionado, a primeira mensagem é enviada imediatamente
- Depois, respeita o intervalo configurado (1h, 2h, 3h, etc.)
- O número remetente é **sortado aleatoriamente** entre os ativos
- A mensagem é **sortada aleatoriamente** entre os templates ativos

## Histórico (aba 📋)
- Mostra todos os envios realizados
- Exibe data/hora, cliente, número que enviou, status (✓ Enviado / ✗ Erro)
- Em caso de erro, mostra a mensagem de erro para diagnóstico

---

## Dicas
- Quanto mais templates e remetentes, mais natural parece para o destinatário
- Intervalos menores = mais mensagens = maior chance de resposta (mas não exagere)
- Se uma instância cair, pause ela nos Remetentes e o sistema para de usá-la
