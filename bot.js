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

// ============================================
// CONFIGURAÇÃO DO ADMINISTRADOR
// ============================================
const NUMERO_ADMIN = process.env.ADMIN_NUMBER || "559981492561@c.us";

// Sistema de pausa do bot
const pausaPath = "./bot_pausado.json";
let botPausado = false;

// Carregar estado de pausa
if (fs.existsSync(pausaPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(pausaPath, "utf-8"));
    botPausado = data.pausado || false;
  } catch (e) {
    console.log("⚠️ Erro ao carregar estado de pausa, iniciando como ativo");
    botPausado = false;
  }
}

function salvarEstadoPausa() {
  const data = { pausado: botPausado };
  fs.writeFileSync(pausaPath, JSON.stringify(data, null, 2));
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

  // Se o estado for "finalizado", adicionar à lista de contatos finalizados
  if (estado === "finalizado" && !contatosFinalizados.includes(numeroWhatsapp)) {
    contatosFinalizados.push(numeroWhatsapp);
    const data = { contatos: contatosFinalizados };
    fs.writeFileSync(contatosPath, JSON.stringify(data, null, 2));
    console.log(`📝 Contato adicionado à lista de finalizados: ${numeroWhatsapp}`);
  }
}

function ehContatoNovo(numeroWhatsapp) {
  // IMPRESCINDÍVEL: Um contato é novo APENAS se:
  // 1. NÃO tem estado (nunca iniciou conversa com o bot)
  // 2. NÃO está na lista de finalizados (conversas existentes no WhatsApp)
  // 
  // Esta é a BARREIRA PRINCIPAL que impede o bot de iniciar para:
  // - Contatos que já iniciaram conversa (têm estado)
  // - Conversas que já existem no WhatsApp (estão na lista de finalizados)
  // 
  // Isso GARANTE que o bot só inicia UMA VEZ por contato
  const temEstado = getEstado(numeroWhatsapp) !== null;
  const estaFinalizado = contatosFinalizados.includes(numeroWhatsapp);

  return !temEstado && !estaFinalizado;
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

  // Status do bot
  if (botPausado) {
    console.log(`⏸️ Bot está PAUSADO - não responderá mensagens`);
    if (NUMERO_ADMIN) {
      console.log(`👤 Administrador configurado: ${NUMERO_ADMIN}`);
      console.log(`💡 Use /ligarbot no WhatsApp para reativar o bot`);
    } else {
      console.log(`⚠️ ATENÇÃO: Número do administrador não configurado!`);
      console.log(`⚠️ Defina NUMERO_ADMIN no código ou use variável de ambiente ADMIN_NUMBER`);
    }
  } else {
    console.log(`▶️ Bot está ATIVO - respondendo mensagens normalmente`);
    if (NUMERO_ADMIN) {
      console.log(`👤 Administrador configurado: ${NUMERO_ADMIN}`);
      console.log(`💡 Comandos disponíveis: /pausarbot ou /ligarbot`);
    }
  }

  // IMPRESCINDÍVEL: Identificar TODOS os contatos e números das conversas existentes no WhatsApp
  // para garantir que o bot NÃO inicie para conversas que já existem
  try {
    console.log("🔍 Buscando TODAS as conversas existentes no WhatsApp...");
    const chats = await client.getChats();
    let contatosIdentificados = 0;
    let contatosAdicionados = 0;
    let contatosComEstado = 0;

    for (const chat of chats) {
      // Obter o ID serializado do chat (string)
      const chatId = chat.id._serialized || chat.id;

      // Ignorar grupos e status
      // Usar isGroup para detectar grupos de forma mais confiável
      if (chat.isGroup || chatId.includes("@g.us") || chatId.includes("status@broadcast")) {
        continue;
      }

      contatosIdentificados++;

      // IMPRESCINDÍVEL: Se o contato já tem estado (conversa já iniciada com o bot),
      // não precisa adicionar aos finalizados, mas já está protegido
      if (getEstado(chatId)) {
        contatosComEstado++;
        continue;
      }

      // IMPRESCINDÍVEL: Se o contato não está nos finalizados e não tem estado,
      // adicionar aos finalizados para que o bot NÃO inicie para conversas que já existem
      if (!contatosFinalizados.includes(chatId)) {
        contatosFinalizados.push(chatId);
        contatosAdicionados++;
      }
    }

    // Salvar a lista atualizada de contatos finalizados
    if (contatosAdicionados > 0) {
      const data = { contatos: contatosFinalizados };
      fs.writeFileSync(contatosPath, JSON.stringify(data, null, 2));
      console.log(
        `✅ ${contatosAdicionados} contatos existentes adicionados à lista de finalizados`,
      );
    }

    console.log(
      `📋 Total de conversas identificadas: ${contatosIdentificados}`,
    );
    console.log(
      `📊 Contatos com estado (já iniciaram): ${contatosComEstado}`,
    );
    console.log(
      `🚫 Total de contatos finalizados/protegidos: ${contatosFinalizados.length}`,
    );
    console.log(
      `✅ Proteção ativa: Bot NÃO iniciará para ${contatosFinalizados.length + contatosComEstado} contatos existentes`,
    );
  } catch (error) {
    console.error(
      "❌ Erro ao buscar conversas existentes:",
      error.message,
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

// Processar mensagens
client.on("message_create", async (message) => {
  // Ignorar mensagens de grupos, do próprio bot e sem conteúdo
  if (
    message.from.includes("@g.us") ||
    message.fromMe ||
    !message.body ||
    message.from.includes("status@broadcast")
  ) {
    return;
  }

  const textoUsuario = message.body.trim().toLowerCase();
  const estadoAtual = getEstado(message.from);
  const ehAdmin = NUMERO_ADMIN && message.from === NUMERO_ADMIN;

  console.log(
    `📩 Mensagem de ${message.from}: "${textoUsuario}" [Estado: ${estadoAtual || "novo"}]`,
  );

  // COMANDOS DE ADMINISTRADOR (funcionam mesmo com bot pausado)
  const ehComandoAdmin = textoUsuario === "/pausarbot" ||
    textoUsuario === "/ligarbot";

  if (ehComandoAdmin) {
    // Verificar se é o administrador autorizado
    if (!ehAdmin) {
      await client.sendMessage(
        message.from,
        "🚫 *Acesso Negado*\n\nApenas o administrador pode usar este comando.",
      );
      console.log(`🚫 Tentativa de usar comando admin de número não autorizado: ${message.from}`);
      return;
    }

    if (textoUsuario === "/pausarbot") {
      botPausado = true;
      salvarEstadoPausa();
      await client.sendMessage(
        message.from,
        "⏸️ *Bot pausado*\n\nO bot não responderá mais mensagens até ser ligado novamente.\n\nUse /ligarbot para reativar.",
      );
      console.log("⏸️ Bot pausado pelo administrador");
      return;
    }

    if (textoUsuario === "/ligarbot") {
      botPausado = false;
      salvarEstadoPausa();
      await client.sendMessage(
        message.from,
        "▶️ *Bot ligado*\n\nO bot voltou a responder mensagens normalmente.",
      );
      console.log("▶️ Bot ligado pelo administrador");
      return;
    }
  }

  // Se o bot está pausado, ignorar todas as mensagens (exceto comandos do admin acima)
  if (botPausado) {
    console.log(`⏸️ Bot pausado - mensagem ignorada de ${message.from}`);
    return;
  }

  // IMPRESCINDÍVEL: Se é contato finalizado, ignorar completamente
  if (contatosFinalizados.includes(message.from)) {
    console.log(`⏭️ Contato já finalizado, ignorando.`);
    return;
  }

  // IMPRESCINDÍVEL: Se o contato tem estado "finalizado", ignorar completamente
  // Garante que o bot não processe mais mensagens de contatos que já finalizaram
  if (estadoAtual === "finalizado") {
    console.log(`⏭️ Contato já finalizou o atendimento, ignorando.`);
    return;
  }

  // IMPRESCINDÍVEL: Se o contato tem QUALQUER estado (conversa já iniciada), 
  // NÃO reiniciar o fluxo - apenas continuar de onde parou
  // Isso garante que o bot só inicia uma vez por contato
  if (estadoAtual && !ehContatoNovo(message.from)) {
    // Contato já iniciou conversa - continuar fluxo baseado no estado atual
    // Não entrar no FLUXO 1 (novo contato)
  }

  let respostaEncontrada = null;

  // FLUXO 1: Novo contato - enviar saudação + menu
  // IMPRESCINDÍVEL: Só inicia se for REALMENTE um contato novo
  // (sem estado E não finalizado E não está na lista de conversas existentes)
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
