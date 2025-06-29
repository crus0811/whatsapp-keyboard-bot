const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const axios = require("axios");
const { Boom } = require("@hapi/boom");
const P = require("pino");

const { TELEGRAM_BOT_TOKEN, TELEGRAM_USER_ID, KEYWORDS } = process.env;
const keywords = KEYWORDS ? KEYWORDS.toLowerCase().split(",") : [];

const { state, saveState } = useSingleFileAuthState("./auth_info.json");

async function startBot() {
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "";

    if (text) {
      const match = keywords.find((kw) => text.toLowerCase().includes(kw.trim()));
      if (match) {
        const sender = msg.key.remoteJid || "unknown";
        await sendTelegramAlert(sender, text);
      }
    }
  });
}

async function sendTelegramAlert(from, message) {
  const text = `📥 *New WhatsApp Message:*\nFrom: \`${from}\`\nMessage: \`${message}\``;
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_USER_ID,
      text,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("Failed to send Telegram alert", err.message);
  }
}

startBot();
