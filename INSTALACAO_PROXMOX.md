# 🖥️ Guia Completo: Instalação do Assistant WhatsApp no Proxmox

Este guia detalha passo a passo como instalar e configurar o Assistant de WhatsApp Business em um servidor Proxmox.

## 📋 O que é Proxmox?

Proxmox VE é uma plataforma de virtualização open-source que permite criar e gerenciar máquinas virtuais (VMs) e containers Linux (LXC). É ideal para manter o Assistant rodando 24/7.

## 🎯 Visão Geral do Processo

```
1. Criar Container/VM no Proxmox
2. Instalar Sistema Operacional (Ubuntu/Debian)
3. Instalar Node.js e dependências
4. Transferir arquivos do Assistant
5. Configurar execução contínua (PM2)
6. Escanear QR Code remotamente
7. Configurar autostart
```

## 🚀 Opção 1: Container LXC (Recomendado)

**Vantagens:**

- Mais leve e rápido
- Menor consumo de recursos
- Boot instantâneo

### Passo 1: Criar Container LXC

1. **Acesse a interface web do Proxmox**
   - Abra navegador: `https://IP-DO-PROXMOX:8006`
   - Faça login com suas credenciais

2. **Criar novo container:**
   - Clique em **"Create CT"** (Assistantão superior direito)

3. **Configurações do Container:**

   **General:**
   - Node: Selecione seu node
   - CT ID: `100` (ou próximo ID disponível)
   - Hostname: `whatsapp-Assistant`
   - Password: Defina senha root forte
   - ☑️ Unprivileged container

   **Template:**
   - Storage: `local`
   - Template: `ubuntu-22.04-standard` (download se necessário)

   **Disks:**
   - Storage: `local-lvm`
   - Disk size: `8 GB` (suficiente para o Assistant)

   **CPU:**
   - Cores: `2` (mínimo 1, recomendado 2)

   **Memory:**
   - Memory (MiB): `2048` (2GB)
   - Swap (MiB): `512`

   **Network:**
   - Bridge: `vmbr0`
   - IPv4: `DHCP` ou defina IP estático
   - IPv6: `DHCP` (ou desabilite)

4. **Finalizar:**
   - Clique em **"Finish"**
   - Aguarde a criação do container

### Passo 2: Iniciar e Acessar o Container

1. **Iniciar container:**

   ```bash
   # Via interface web: Selecione o container → Clique "Start"
   # Ou via terminal Proxmox:
   pct start 100
   ```

2. **Acessar console do container:**

   ```bash
   # Via interface web: Selecione o container → Console
   # Ou via terminal Proxmox:
   pct enter 100
   ```

3. **Fazer login:**
   - Usuário: `root`
   - Senha: A que você definiu na criação

### Passo 3: Atualizar Sistema

```bash
# Atualizar lista de pacotes
apt update

# Atualizar sistema
apt upgrade -y

# Instalar utilitários essenciais
apt install -y curl wget git nano sudo
```

### Passo 4: Instalar Node.js

```bash
# Instalar Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v20.x.x
npm --version   # Deve mostrar 10.x.x
```

### Passo 5: Instalar Dependências do Sistema

O Assistant precisa de bibliotecas para o Puppeteer (navegador headless):

```bash
# Instalar dependências do Chromium
apt install -y \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libatspi2.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libwayland-client0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  xdg-utils \
  libu2f-udev \
  libvulkan1
```

### Passo 6: Criar Usuário para o Assistant (Opcional mas Recomendado)

```bash
# Criar usuário
adduser whatsapp
# Defina senha e confirme dados

# Adicionar ao grupo sudo (opcional)
usermod -aG sudo whatsapp

# Trocar para o usuário
su - whatsapp
```

### Passo 7: Transferir Arquivos do Assistant

**Opção A: Via Git (se tiver repositório)**

```bash
# No container, como usuário whatsapp
cd ~
git clone https://github.com/seu-usuario/chatAssistant.git
cd chatAssistant
```

**Opção B: Via SCP do seu computador**

```bash
# No seu Mac/PC (não no container!)
cd /Users/amesq/Desktop
scp -r chatAssistant root@IP-DO-CONTAINER:/root/
# Ou se criou usuário whatsapp:
scp -r chatAssistant whatsapp@IP-DO-CONTAINER:/home/whatsapp/
```

**Opção C: Via SFTP (FileZilla, Cyberduck, etc.)**

1. Abra seu cliente SFTP
2. Conecte em: `sftp://IP-DO-CONTAINER:22`
3. Usuário: `root` ou `whatsapp`
4. Arraste a pasta `chatAssistant` para o servidor

### Passo 8: Instalar Dependências do Assistant

```bash
# Navegar até a pasta do Assistant
cd ~/chatAssistant  # ou /root/chatAssistant

# Instalar dependências
npm install

# Verificar se instalou corretamente
ls node_modules/  # Deve mostrar whatsapp-web.js e outras
```

### Passo 9: Testar o Assistant Manualmente

```bash
# Primeira execução para testar
npm start
```

Você verá:

```
📱 Escaneie o QR Code abaixo com seu WhatsApp Business:
███████████████████████████
███████████████████████████
```

------ FUNCIONOU PRA MIM, APARECEU O QR CODE ---------------------------------------------

**⚠️ PROBLEMA:** Não dá para escanear QR Code no terminal remoto!

**SOLUÇÕES:**

**Solução 1: Usar tmux + SSH com X11 (Complicado)**

**Solução 2: Salvar QR Code em arquivo (Recomendado)**

Edite temporariamente o `Assistant.js`:

```bash
nano Assistant.js
```

Encontre a seção do QR Code e modifique:

```javascript
// Gerar QR Code para conectar
client.on("qr", (qr) => {
  console.log("📱 QR Code gerado! Acesse via navegador:");
  qrcode.generate(qr, { small: true });

  // ADICIONAR ESTAS LINHAS:
  const fs = require("fs");
  const QRCode = require("qrcode");
  QRCode.toFile("./qrcode.png", qr, (err) => {
    if (err) console.error(err);
    console.log("✅ QR Code salvo em qrcode.png");
    console.log(
      `📥 Baixe via: scp root@${require("os").hostname()}:~/chatAssistant/qrcode.png ./`,
    );
  });
});
```

Instale a biblioteca adicional:

```bash
npm install qrcode
```

Agora ao rodar `npm start`, o QR Code será salvo em arquivo!

**Solução 3: Usar servidor web temporário (Mais Fácil)**

Crie arquivo `server-qr.js`:

```bash
nano server-qr.js
```

Cole este conteúdo:

```javascript
const express = require("express");
const QRCode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");

const app = express();
let qrCodeData = "";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  qrCodeData = qr;
  console.log("✅ QR Code gerado! Acesse: http://IP-DO-CONTAINER:3000");
});

client.on("ready", () => {
  console.log("✅ WhatsApp conectado!");
  console.log("Você pode fechar o navegador e pressionar Ctrl+C aqui");
});

app.get("/", async (req, res) => {
  if (!qrCodeData) {
    return res.send(
      "<h1>Aguardando QR Code...</h1><script>setTimeout(() => location.reload(), 2000)</script>",
    );
  }
  try {
    const qrImage = await QRCode.toDataURL(qrCodeData);
    res.send(`
      <html>
        <body style="text-align:center; padding:50px; font-family:Arial;">
          <h1>🤖 Assistant WhatsApp - Escaneie o QR Code</h1>
          <img src="${qrImage}" style="width:400px; height:400px;"/>
          <p>Escaneie com seu WhatsApp Business</p>
          <script>setTimeout(() => location.reload(), 30000)</script>
        </body>
      </html>
    `);
  } catch (err) {
    res.send("<h1>Erro ao gerar QR Code</h1>");
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("🌐 Servidor QR rodando em http://0.0.0.0:3000");
});

client.initialize();
```

Instale dependência:

```bash
npm install express qrcode
```

Execute:

```bash
node server-qr.js
```

Acesse no navegador do seu computador:

```
http://IP-DO-CONTAINER:3000
```

Escaneie o QR Code e pronto! Depois pressione `Ctrl+C` para parar.

### Passo 10: Instalar PM2 (Gerenciador de Processos)

PM2 mantém o Assistant rodando continuamente e reinicia automaticamente se cair:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar o Assistant com PM2
pm2 start Assistant.js --name "whatsapp-Assistant"

# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs whatsapp-Assistant

# Parar o Assistant
pm2 stop whatsapp-Assistant

# Reiniciar o Assistant
pm2 restart whatsapp-Assistant

# Remover do PM2
pm2 delete whatsapp-Assistant
```

### Passo 11: Configurar Autostart do PM2

```bash
# Salvar configuração atual do PM2
pm2 save

# Gerar script de inicialização automática
pm2 startup

# Copie e execute o comando que aparecer (algo como):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u whatsapp --hp /home/whatsapp
```

Agora o Assistant inicia automaticamente quando o container reiniciar!

### Passo 12: Comandos Úteis do PM2

```bash
# Ver logs
pm2 logs whatsapp-Assistant --lines 100

# Monitorar recursos
pm2 monit

# Reiniciar se usar muita memória
pm2 restart whatsapp-Assistant

# Ver informações detalhadas
pm2 show whatsapp-Assistant

# Limpar logs antigos
pm2 flush
```

## 🖥️ Opção 2: Máquina Virtual (VM)

Se preferir VM ao invés de container:

### Criar VM no Proxmox

1. **Clique em "Create VM"**

2. **Configurações:**
   - General:
     - Node: Seu node
     - VM ID: `100`
     - Name: `whatsapp-Assistant`
   - OS:
     - ISO: Ubuntu Server 22.04 LTS (faça upload antes)
     - Type: Linux
     - Version: 6.x - 2.6 Kernel
   - System:
     - BIOS: Default (SeaBIOS)
     - Machine: Default (i440fx)
   - Disks:
     - Bus/Device: VirtIO Block
     - Storage: local-lvm
     - Disk size: 20 GB
   - CPU:
     - Cores: 2
     - Type: host
   - Memory:
     - Memory: 2048 MB
   - Network:
     - Bridge: vmbr0
     - Model: VirtIO

3. **Iniciar VM e instalar Ubuntu:**
   - Start VM
   - Open Console
   - Siga instalação padrão do Ubuntu
   - Instale OpenSSH Server durante instalação

4. **Após instalação, siga os mesmos passos do Container (Passo 3 em diante)**

## 🔧 Configurações Adicionais

### Configurar IP Estático (Opcional)

```bash
# Editar configuração de rede
nano /etc/netplan/00-installer-config.yaml
```

Exemplo de configuração:

```yaml
network:
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
  version: 2
```

Aplicar:

```bash
netplan apply
```

### Configurar Firewall (Opcional)

```bash
# Instalar UFW
apt install -y ufw

# Permitir SSH
ufw allow 22/tcp

# Permitir porta do servidor QR (se usar)
ufw allow 3000/tcp

# Ativar firewall
ufw enable

# Ver status
ufw status
```

### Backup Automático

```bash
# Criar script de backup
nano /root/backup-Assistant.sh
```

Cole:

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup dos dados importantes
tar -czf $BACKUP_DIR/Assistant-backup-$DATE.tar.gz \
  /home/whatsapp/chatAssistant/estados_contatos.json \
  /home/whatsapp/chatAssistant/contatos.json \
  /home/whatsapp/chatAssistant/.wwebjs_auth

# Manter apenas últimos 7 backups
ls -t $BACKUP_DIR/Assistant-backup-*.tar.gz | tail -n +8 | xargs rm -f

echo "Backup concluído: Assistant-backup-$DATE.tar.gz"
```

Tornar executável:

```bash
chmod +x /root/backup-Assistant.sh
```

Agendar backup diário (crontab):

```bash
crontab -e
```

Adicione:

```
0 2 * * * /root/backup-Assistant.sh
```

### Monitoramento de Recursos

```bash
# Ver uso de CPU e memória
htop

# Ver uso de disco
df -h

# Ver processos
ps aux | grep node
```

## 📊 Gerenciamento e Manutenção

### Atualizar o Assistant

```bash
# Parar o Assistant
pm2 stop whatsapp-Assistant

# Atualizar código (se usar git)
cd ~/chatAssistant
git pull

# Ou substituir arquivos manualmente via SCP

# Instalar novas dependências (se houver)
npm install

# Reiniciar
pm2 restart whatsapp-Assistant
```

### Ver Logs

```bash
# Logs do PM2
pm2 logs whatsapp-Assistant

# Logs do sistema
journalctl -u pm2-whatsapp -f
```

### Reiniciar Container/VM do Proxmox

```bash
# Via interface web: Select Container → Shutdown → Start

# Via terminal Proxmox:
pct stop 100 && pct start 100    # Container
qm stop 100 && qm start 100       # VM
```

## ⚠️ Troubleshooting

### Assistant não conecta ao WhatsApp

1. Verificar logs: `pm2 logs whatsapp-Assistant`
2. Limpar autenticação: `rm -rf .wwebjs_auth`
3. Reiniciar: `pm2 restart whatsapp-Assistant`
4. Gerar novo QR Code

### Erro de memória

```bash
# Aumentar memória do container no Proxmox
# Interface web: Container → Resources → Memory → Edit

# Ou via terminal:
pct set 100 -memory 4096
```

### Container não inicia

```bash
# Ver logs do container
pct status 100
journalctl -xe
```

## 📞 Acessar o Assistant de Fora da Rede (Opcional)

### Opção 1: Port Forward no Roteador

1. Acesse configurações do seu roteador
2. Configure Port Forward:
   - Porta Externa: 2222
   - Porta Interna: 22
   - IP: IP-DO-CONTAINER
3. Acesse via: `ssh user@SEU-IP-PUBLICO -p 2222`

### Opção 2: VPN (Mais Seguro)

- Configure WireGuard ou OpenVPN no Proxmox
- Conecte via VPN para acessar rede interna

## ✅ Checklist Final

- [ ] Container/VM criado e rodando
- [ ] Node.js instalado e funcionando
- [ ] Assistant copiado para o servidor
- [ ] Dependências instaladas (`npm install`)
- [ ] WhatsApp conectado (QR Code escaneado)
- [ ] PM2 configurado e Assistant rodando
- [ ] Autostart configurado
- [ ] Backup automático agendado
- [ ] Testado envio de mensagem

## 🎓 Próximos Passos

1. Monitore o Assistant por alguns dias
2. Configure alertas por email (Proxmox Datacenter → Options → Email)
3. Documente seu IP e credenciais em local seguro
4. Configure backup do container inteiro (Proxmox Backup Server)

---

**Dúvidas?** Revise os logs com `pm2 logs` e `journalctl -xe`

**Desenvolvido para Itales** | Guia de Instalação Proxmox v1.0
