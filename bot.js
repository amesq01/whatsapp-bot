const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");

// Carregar respostas do arquivo JSON
const respostas = JSON.parse(fs.readFileSync("./respostas.json", "utf-8"));

// Carregar contatos já atendidos; se não existir, cria
const contatosPath = "./contatos.json";
if (!fs.existsSync(contatosPath)) {
  fs.writeFileSync(contatosPath, JSON.stringify({ contatos: [] }, null, 2));
}
let contatosKnown = JSON.parse(fs.readFileSync(contatosPath, "utf-8"));

function salvarContatos() {
  fs.writeFileSync(contatosPath, JSON.stringify(contatosKnown, null, 2));
}

function ehContatoNovo(numeroWhatsapp) {
  return !contatosKnown.contatos.includes(numeroWhatsapp);
}

function registrarContato(numeroWhatsapp) {
  if (!contatosKnown.contatos.includes(numeroWhatsapp)) {
    contatosKnown.contatos.push(numeroWhatsapp);
    salvarContatos();
    console.log(`📝 Novo contato registrado: ${numeroWhatsapp}`);
  }
}

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

  // Pré-carregar contatos que já têm histórico para não responder
  try {
    const chats = await client.getChats();
    const idsExistentes = chats
      .filter((c) => !c.isGroup)
      .map((c) => c.id?._serialized)
      .filter(Boolean);
    const novos = idsExistentes.filter(
      (id) => !contatosKnown.contatos.includes(id),
    );
    if (novos.length) {
      contatosKnown.contatos.push(...novos);
      salvarContatos();
      console.log(`📚 Contatos existentes carregados: ${novos.length}`);
    }
  } catch (e) {
    console.log(
      "⚠️ Não foi possível pré-carregar chats existentes:",
      e.message,
    );
  }

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

  // Ignorar quem já conversou antes
  if (!ehContatoNovo(message.from)) {
    console.log(`⏭️ Ignorando ${message.from}: contato já existente.`);
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
    registrarContato(message.from);
  } catch (error) {
    // Se o erro for relacionado a markedUnread, ainda assim a mensagem pode ter sido enviada
    if (error.message.includes("markedUnread")) {
      console.log(
        `✅ Resposta enviada para ${message.from} (apesar do aviso interno)`,
      );
      registrarContato(message.from);
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
