# 🤖 Assistant WhatsApp Business Itales - Sistema de Atendimento Automatizado

Assistant de WhatsApp Business inteligente com fluxo conversacional completo para qualificação de leads e agendamento de atendimentos. Desenvolvido sem IA, utilizando respostas predefinidas e máquina de estados.

## 📋 Sobre o Projeto

Sistema de atendimento automatizado para WhatsApp Business focado em qualificação de leads interessados em **Relógios, Imóveis, Veículos e Investimentos**. O Assistant conduz o cliente através de um fluxo estruturado, coletando informações essenciais antes de transferir para a equipe de vendas.

## ✨ Funcionalidades

- ✅ Atende apenas **contatos novos** (primeira interação)
- ✅ Saudação personalizada automática para qualquer mensagem inicial
- ✅ Menu interativo com 4 categorias de produtos/serviços
- ✅ Fluxo conversacional em 5 etapas
- ✅ Registro automático de todas as respostas no chat
- ✅ Sistema de estados para controle do fluxo
- ✅ Qualificação de leads com valor desejado
- ✅ Agendamento ou atendimento imediato
- ✅ Não responde mensagens de grupos
- ✅ Ignora contatos já atendidos

## 🎯 Fluxo de Conversação

```
┌─────────────────────────────────────────┐
│ 1. Cliente envia QUALQUER mensagem     │
│    → Assistant: Saudação + Menu (1-4)        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ 2. Cliente escolhe: 1, 2, 3 ou 4       │
│    → Assistant: "✅ Selecionou: [Categoria]"  │
│    → Assistant: "Qual o valor do bem?"        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ 3. Cliente informa o valor             │
│    → Assistant: "✅ Valor informado: R$ X"    │
│    → Assistant: "Disponível agora ou agendar?"│
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼──────┐   ┌────────▼────────┐
│ 4a. "agora"  │   │ 4b. "agendar"   │
│ → Finaliza   │   │ → Pede horário  │
└──────────────┘   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │ 5. Cliente      │
                   │    informa      │
                   │    horário      │
                   │ → Finaliza      │
                   └─────────────────┘
```

## 📁 Estrutura do Projeto

```
chatAssistant/
├── Assistant.js                    # Código principal do Assistant
├── respostas.json            # Configuração de mensagens e fluxo
├── estados_contatos.json     # Estados de cada contato (gerado automaticamente)
├── contatos.json             # Lista de contatos finalizados
├── package.json              # Dependências do projeto
├── package-lock.json         # Lock de dependências
├── .gitignore                # Arquivos ignorados pelo Git
└── README.md                 # Esta documentação
```

### Descrição dos Arquivos

**`Assistant.js`**

- Motor principal do Assistant
- Gerencia conexão com WhatsApp Web
- Implementa máquina de estados
- Controla o fluxo conversacional

**`respostas.json`**

- Configuração de todas as mensagens
- Define categorias de produtos/serviços
- Perguntas do fluxo
- Respostas personalizadas

**`estados_contatos.json`** (gerado automaticamente)

- Rastreia em qual etapa cada contato está
- Estados possíveis:
  - `aguardando_categoria` - Esperando escolha de produto
  - `aguardando_valor` - Esperando valor do bem
  - `aguardando_disponibilidade` - Esperando resposta sobre atendimento
  - `aguardando_horario` - Esperando horário para agendamento
  - `finalizado` - Atendimento concluído

**`contatos.json`**

- Lista de contatos que já foram atendidos
- Assistant não responde contatos desta lista

## 🚀 Instalação

### Pré-requisitos

- Node.js 14+ instalado
- WhatsApp Business no celular
- Conexão estável com internet

### Passo a Passo

1. **Instale as dependências:**

```bash
npm install
```

2. **Inicie o Assistant:**

```bash
npm start
```

3. **Conecte seu WhatsApp:**
   - Um QR Code aparecerá no terminal
   - Abra o WhatsApp Business no celular
   - Vá em **⚙️ Configurações** → **Aparelhos conectados**
   - Clique em **Conectar aparelho**
   - Escaneie o QR Code do terminal

4. **Pronto!** O Assistant está funcionando ✅

## 🎨 Personalização

### Alterar Mensagens e Categorias

Edite o arquivo **`respostas.json`**:

```json
{
  "saudacao": "Sua saudação personalizada aqui",
  "categorias": {
    "1": "Nome da Categoria 1",
    "2": "Nome da Categoria 2",
    "3": "Nome da Categoria 3",
    "4": "Nome da Categoria 4"
  },
  "pergunta_valor": "Sua pergunta sobre valor",
  "pergunta_disponibilidade": "Sua pergunta sobre disponibilidade"
}
```

### Resetar Contatos Atendidos

Para permitir que o Assistant responda contatos antigos novamente:

```bash
# Limpar lista de contatos finalizados
echo '{"contatos": []}' > contatos.json

# Limpar estados de conversação
echo '{}' > estados_contatos.json
```

### Adicionar Mais Categorias

1. Adicione no `respostas.json`:

```json
"categorias": {
  "1": "Relógios",
  "2": "Imóveis",
  "3": "Veículos",
  "4": "Investimentos",
  "5": "Sua Nova Categoria"
}
```

2. Atualize a saudação com a nova opção

3. Adicione a validação no `Assistant.js`:

```javascript
if (["1", "2", "3", "4", "5"].includes(textoUsuario)) {
```

## 🛠️ Comandos Disponíveis

```bash
npm start          # Inicia o Assistant
npm run dev        # Inicia em modo desenvolvimento (com auto-reload)
```

## 📊 Logs e Monitoramento

O Assistant exibe logs detalhados no terminal:

```
✅ Assistant conectado e pronto!
📩 Mensagem de 559981234567@c.us: "oi" [Estado: novo]
🆕 Novo contato! Estado: aguardando_categoria
✅ Resposta enviada
✅ Categoria registrada: 🕐 Relógios
✅ Valor registrado: R$ 50000
✅ Atendimento finalizado - agora
```

## ❓ Solução de Problemas

### Erro: "Cannot read properties of undefined (reading 'markedUnread')"

**Solução:** Este é um aviso interno do WhatsApp Web. A mensagem é enviada com sucesso mesmo com este erro. O Assistant já trata isso automaticamente.

### Assistant não responde mensagens

**Verifique:**

1. O Assistant está conectado? (Veja no terminal)
2. O contato já foi atendido antes? (Verifique `contatos.json`)
3. É uma mensagem de grupo? (Assistant ignora grupos)

### QR Code não aparece

**Solução:**

1. Pare o Assistant (`Ctrl + C`)
2. Remova a pasta de autenticação: `rm -rf .wwebjs_auth`
3. Inicie novamente: `npm start`

### Assistant desconectou sozinho

**Solução:**

- O Assistant se reconecta automaticamente
- Se não reconectar, reinicie: `npm start`

## 🔒 Segurança e Boas Práticas

- ✅ Nunca compartilhe a pasta `.wwebjs_auth/`
- ✅ Mantenha backup dos arquivos `contatos.json` e `estados_contatos.json`
- ✅ Use `.gitignore` para não versionar dados sensíveis
- ✅ Monitore os logs regularmente
- ✅ Reinicie o Assistant diariamente para evitar problemas de memória

## 📦 Dependências

```json
{
  "whatsapp-web.js": "^1.25.0", // Cliente WhatsApp Web
  "qrcode-terminal": "^0.12.0" // Gerador de QR Code
}
```

## 🚧 Limitações

- Assistant responde apenas contatos novos (primeira interação)
- Não envia imagens/áudios/arquivos (apenas texto)
- Não funciona em grupos
- Requer que o WhatsApp Business fique conectado
- Depende de conexão estável

## 🔄 Atualizações Futuras (Roadmap)

- [ ] Suporte a envio de imagens/catálogos
- [ ] Integração com CRM
- [ ] Dashboard web para monitoramento
- [ ] Relatórios de atendimento
- [ ] Múltiplos atendentes
- [ ] Horário de funcionamento configurável
- [ ] Respostas com Assistantões interativos

## 📝 Licença

Este projeto é de uso interno da Itales.

## 👨‍💻 Suporte

Para dúvidas ou problemas:

- 📧 Email: suporte@itales.com.br
- 📱 WhatsApp: (11) 9999-9999

---

**Desenvolvido para Itales** | Versão 1.0.0 | Janeiro 2026
