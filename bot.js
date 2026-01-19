const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");

// Carregar respostas do arquivo JSON
const respostas = JSON.parse(fs.readFileSync("./respostas.json", "utf-8"));

// Carregar estados dos contatos; se não existir, cria
const estadosPath = "./estados_contatos.json";
if (!fs.existsSync(estadosPath)) {
  fs.writeFileSync(estadosPath, JSON.stringify({}, null, 2));
}
let estadosContatos = JSON.parse(fs.readFileSync(estadosPath, "utf-8"));

// Carregar lista de contatos já finalizados (não responde mais)
const contatosPath = "./contatos.json";
let contatosFinalizados = [];
if (fs.existsSync(contatosPath)) {
  const data = JSON.parse(fs.readFileSync(contatosPath, "utf-8"));
  contatosFinalizados = data.contatos || [];
}

function salvarEstados() {
  fs.writeFileSync(estadosPath, JSON.stringify(estadosContatos, null, 2));
}

function getEstado(numeroWhatsapp) {
  return estadosContatos[numeroWhatsapp] || null;
}

function setEstado(numeroWhatsapp, estado) {
  estadosContatos[numeroWhatsapp] = estado;
  salvarEstados();
}

function ehContatoNovo(numeroWhatsapp) {
  return (
    !getEstado(numeroWhatsapp) && !contatosFinalizados.includes(numeroWhatsapp)
  );
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

  // Sistema de estados carregado
  console.log(
    `📊 Estados carregados: ${Object.keys(estadosContatos).length} contatos`,
  );
  console.log(`🚫 Contatos finalizados: ${contatosFinalizados.length}`);

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

// Processar mensagens
client.on("message_create", async (message) => {
  // Ignorar: grupos, próprio bot, sem conteúdo, status e status replies
  if (
    message.from.includes("@g.us") ||
    message.from === "status@broadcast" ||
    message.to === "status@broadcast" ||
    message.fromMe ||
    !message.body ||
    !message.from.includes("@c.us")
  ) {
    return;
  }

  const textoUsuario = message.body.trim().toLowerCase();
  const estadoAtual = getEstado(message.from);

  console.log(
    `📩 Mensagem de ${message.from}: "${textoUsuario}" [Estado: ${estadoAtual || "novo"}]`,
  );

  // Se é contato finalizado, ignorar
  if (contatosFinalizados.includes(message.from)) {
    console.log(`⏭️ Contato já finalizado, ignorando.`);
    return;
  }

  let respostaEncontrada = null;

  // FLUXO 1: Novo contato - enviar saudação + menu
  if (ehContatoNovo(message.from)) {
    respostaEncontrada = respostas.saudacao;
    setEstado(message.from, "aguardando_categoria");
    console.log(`🆕 Novo contato! Estado: aguardando_categoria`);
  }
  // FLUXO 2: Selecionou categoria (1, 2, 3, 4) - registrar e pedir valor
  else if (estadoAtual === "aguardando_categoria") {
    if (["1", "2", "3", "4"].includes(textoUsuario)) {
      const nomeCategoria = respostas.categorias[textoUsuario];

      // Registrar a categoria no chat
      try {
        await client.sendMessage(
          message.from,
          `✅ Você selecionou: ${nomeCategoria}`,
        );
        console.log(`✅ Categoria registrada: ${nomeCategoria}`);
      } catch (error) {
        console.error("❌ Erro ao registrar categoria:", error.message);
      }

      // Enviar pergunta de valor
      setTimeout(async () => {
        try {
          await client.sendMessage(message.from, respostas.pergunta_valor);
          setEstado(message.from, "aguardando_valor");
          console.log(`⏳ Estado: aguardando_valor`);
        } catch (error) {
          console.error("❌ Erro ao enviar pergunta de valor:", error.message);
        }
      }, 500);
      return;
    } else {
      // Se não escolheu opção válida, reenviar menu
      respostaEncontrada = respostas.saudacao;
    }
  }
  // FLUXO 3: Respondeu o valor - pedir disponibilidade
  else if (estadoAtual === "aguardando_valor") {
    // Registrar o valor informado
    try {
      await client.sendMessage(
        message.from,
        `✅ Valor informado: ${textoUsuario}`,
      );
      console.log(`✅ Valor registrado: ${textoUsuario}`);
    } catch (error) {
      console.error("❌ Erro ao registrar valor:", error.message);
    }

    // Enviar pergunta de disponibilidade
    setTimeout(async () => {
      try {
        await client.sendMessage(
          message.from,
          `${respostas.pergunta_disponibilidade}\n\nResponda: *agora* ou *agendar*`,
        );
        setEstado(message.from, "aguardando_disponibilidade");
        console.log(`⏳ Estado: aguardando_disponibilidade`);
      } catch (error) {
        console.error(
          "❌ Erro ao enviar pergunta de disponibilidade:",
          error.message,
        );
      }
    }, 500);
    return;
  }
  // FLUXO 4: Respondeu sobre disponibilidade
  else if (estadoAtual === "aguardando_disponibilidade") {
    if (textoUsuario.includes("agora")) {
      respostaEncontrada = respostas.opcoes_disponibilidade.agora;
      setEstado(message.from, "finalizado");
      console.log(`✅ Atendimento finalizado - agora`);
    } else if (textoUsuario.includes("agendar")) {
      respostaEncontrada = respostas.opcoes_disponibilidade.agendar;
      setEstado(message.from, "aguardando_horario");
      console.log(`⏳ Estado: aguardando_horario`);
    } else {
      respostaEncontrada = `${respostas.pergunta_disponibilidade}\n\nResponda: *agora* ou *agendar*`;
    }
  }
  // FLUXO 5: Aguardando horário de agendamento
  else if (estadoAtual === "aguardando_horario") {
    try {
      await client.sendMessage(
        message.from,
        `✅ Horário agendado: ${textoUsuario}\n\nNossa equipe confirmará em breve!`,
      );
      setEstado(message.from, "finalizado");
      console.log(`✅ Atendimento finalizado - horário: ${textoUsuario}`);
    } catch (error) {
      console.error("❌ Erro ao registrar horário:", error.message);
    }
    return;
  }

  // Enviar resposta
  if (respostaEncontrada) {
    try {
      await client.sendMessage(message.from, respostaEncontrada);
      console.log(`✅ Resposta enviada para ${message.from}`);
    } catch (error) {
      if (error.message.includes("markedUnread")) {
        console.log(`✅ Resposta enviada (com aviso interno)`);
      } else {
        console.error("❌ Erro ao enviar:", error.message);
      }
    }
  }
});

// Tratar desconexão
client.on("disconnected", (reason) => {
  console.log("❌ Bot desconectado:", reason);
});

// Iniciar bot
client.initialize();
