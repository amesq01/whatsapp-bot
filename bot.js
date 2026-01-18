const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");

// Carregar respostas do arquivo JSON
const respostas = JSON.parse(fs.readFileSync("./respostas.json", "utf-8"));

// Inicializar cliente
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
  webVersionCache: {
    type: "none",
  },
});

// Gerar QR Code para conectar
client.on("qr", (qr) => {
  console.log("📱 Escaneie o QR Code abaixo com seu WhatsApp Business:");
  qrcode.generate(qr, { small: true });
});

// Quando conectar com sucesso
client.on("ready", async () => {
  console.log("✅ Bot conectado e pronto!");
  console.log("⏰ Aguardando mensagens...");

  // Desabilitar a função que tenta marcar como lido
  try {
    await client.pupPage.evaluate(() => {
      // Substituir a função que causa o erro
      if (window.WWebJS && window.WWebJS.sendSeen) {
        window.WWebJS.sendSeen = async () => {
          return Promise.resolve();
        };
      }
    });
  } catch (e) {
    console.log("⚠️ Aviso ao desabilitar sendSeen:", e.message);
  }
});

// Processar mensagens (apenas novas)
client.on("message_create", async (message) => {
  // Ignorar mensagens de grupos, do próprio bot e sem conteúdo
  if (message.from.includes("@g.us") || message.fromMe || !message.body) {
    return;
  }

  const textoUsuario = message.body.trim().toLowerCase();
  console.log(`📩 Mensagem recebida de ${message.from}: ${textoUsuario}`);

  // Buscar resposta correspondente
  let respostaEncontrada = null;

  // Verificar comandos exatos
  if (respostas.comandos[textoUsuario]) {
    respostaEncontrada = respostas.comandos[textoUsuario];
  }
  // Verificar palavras-chave
  else {
    for (const [chave, resposta] of Object.entries(respostas.palavrasChave)) {
      if (textoUsuario.includes(chave)) {
        respostaEncontrada = resposta;
        break;
      }
    }
  }

  // Se não encontrou resposta, enviar mensagem padrão
  if (!respostaEncontrada) {
    respostaEncontrada = respostas.respostaPadrao;
  }

  // Enviar resposta
  try {
    await client.sendMessage(message.from, respostaEncontrada);
    console.log(`✅ Resposta enviada para ${message.from}`);
  } catch (error) {
    // Se o erro for relacionado a markedUnread, ainda assim a mensagem pode ter sido enviada
    if (error.message.includes("markedUnread")) {
      console.log(
        `✅ Resposta enviada para ${message.from} (apesar do aviso interno)`,
      );
    } else {
      console.error("❌ Erro ao enviar:", error.message);
    }
  }
});

// Tratar desconexão
client.on("disconnected", (reason) => {
  console.log("❌ Bot desconectado:", reason);
});

// Iniciar bot
client.initialize();
