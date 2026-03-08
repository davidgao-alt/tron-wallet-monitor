import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import axios from "axios";
import { TronWeb } from "tronweb";

const tronWeb = new TronWeb({ fullHost: "https://api.trongrid.io" });

const WATCH_ADDRESS = "";
const TG_BOT_TOKEN = "";
const TG_CHAT_ID = "";

const seen = new Set<string>();
const INTERVAL = 4000;

let initialized = false;

async function sendTG(msg: string) {
  const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;

  for (let i = 0; i < 3; i++) {
    try {
      await axios.post(
        url,
        {
          chat_id: TG_CHAT_ID,
          text: msg,
          disable_web_page_preview: true
        },
        { timeout: 10000 }
      );
      return;
    } catch (err) {
      if (i === 2) {
        console.error("Telegram send failed:", err);
      } else {
        await new Promise(res => setTimeout(res, 2000));
      }
    }
  }
}

function sunToTRXFull(n: number) {
  return (n / 1_000_000).toFixed(6);
}

function formatLocalTime(ts: number) {
  const d = new Date(ts);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} (UTC)`;
}

async function fetchTxs() {
  const url =
    `https://apilist.tronscan.org/api/transaction?sort=-timestamp&count=true&limit=20&start=0&address=${WATCH_ADDRESS}`;

  const res = await axios.get<any>(url, { timeout: 10000 });

  return res.data?.data || [];
}

async function poll() {
  try {
    const txs = await fetchTxs();

    if (!initialized) {
      if (txs.length > 0) {
        const latest = txs[0];

        if (latest.contractType === 1 && latest.toAddress === WATCH_ADDRESS) {
          const amount = sunToTRXFull(latest.amount || 0);

          const msg = `Incoming TRX

Amount:
${amount} TRX

From:
${latest.ownerAddress}

Hash:
${latest.hash}
https://tronscan.org/#/transaction/${latest.hash}

Time:
${formatLocalTime(latest.timestamp)}
`;

          console.log(msg);
          await sendTG(msg);
        }
      }

      for (const tx of txs) {
        seen.add(tx.hash);
      }

      initialized = true;
      return;
    }

    /* ===== 正常监听 ===== */
    for (const tx of txs) {
      if (seen.has(tx.hash)) continue;
      seen.add(tx.hash);

      if (tx.contractType !== 1) continue;
      if (tx.toAddress !== WATCH_ADDRESS) continue;

      const amount = sunToTRXFull(tx.amount || 0);

      const msg = `Incoming TRX

Amount:
${amount} TRX

From:
${tx.ownerAddress}

Hash:
${tx.hash}
https://tronscan.org/#/transaction/${tx.hash}

Time:
${formatLocalTime(tx.timestamp)}
`;

      console.log(msg);
      await sendTG(msg);
    }

  } catch (e) {
    console.error("poll error:", e);
  }
}

console.log("Tron TRX Monitor started...");
setInterval(poll, INTERVAL);