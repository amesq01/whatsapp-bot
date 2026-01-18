# 🤖 Bot WhatsApp Business - Respostas Automáticas

Bot simples para WhatsApp Business com respostas predefinidas (sem IA).

## 📋 Pré-requisitos

- Node.js instalado (versão 14 ou superior)
- WhatsApp Business no celular
- Conexão com internet

## 🚀 Como instalar

1. Instale as dependências:

```bash
npm install
```

## ▶️ Como usar

1. Inicie o bot:

```bash
npm start
```

2. Um QR Code aparecerá no terminal

3. Abra seu WhatsApp Business no celular

4. Vá em **Configurações** > **Aparelhos conectados** > **Conectar aparelho**

5. Escaneie o QR Code do terminal

6. Pronto! O bot está conectado e funcionando

## ✏️ Como personalizar as respostas

Edite o arquivo `respostas.json`:

### Comandos Exatos

```json
"comandos": {
  "oi": "Sua resposta aqui",
  "menu": "Seu menu aqui"
}
```

### Palavras-Chave (busca dentro da mensagem)

```json
"palavrasChave": {
  "horário": "Resposta sobre horário",
  "preço": "Resposta sobre preços"
}
```

### Resposta Padrão (quando não encontra nada)

```json
"respostaPadrao": "Desculpe, não entendi..."
```

## 📱 Exemplos de uso

- Cliente envia: "oi" → Bot responde com menu
- Cliente envia: "1" → Bot responde horário
- Cliente envia: "qual o horário?" → Bot responde horário (palavra-chave)
- Cliente envia: "xpto" → Bot responde mensagem padrão

## ⚠️ Importante

- O bot só responde mensagens NOVAS (não responde histórico)
- Não responde em grupos
- Mantenha o terminal aberto enquanto o bot estiver funcionando
- A sessão fica salva, não precisa escanear QR Code toda vez

## 🛑 Como parar o bot

Pressione `Ctrl + C` no terminal

## 🔄 Modo desenvolvimento (reinicia automaticamente ao editar)

```bash
npm run dev
```
