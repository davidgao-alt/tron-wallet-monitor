import axios from "axios";

const WATCH_ADDRESS = "";

// TEySEZLJf6rs2mCujGpDEsgoMVWKLAk9mT
//THM28kapdZqMkJjEVWxViu8MhjrdyuJqBz

const TG_BOT_TOKEN = "";
const TG_CHAT_ID = "";

// const TG_BOT_TOKEN = "7624574350:AAFQTF-tIW9IREdx-zoUfLYX-VRfjB2aBZY";
// const TG_CHAT_ID = "-5225818932";

// const TG_BOT_TOKEN = "8513438350:AAHDA6dwxmYMF231queT_gzREin3luQSmcQ";
// const TG_CHAT_ID = "-1003712720647";


const INTERVAL = 10_000; 
const seenTRC20 = new Set<string>();
const seenTRC10 = new Set<string>();   

/* ========= Telegram ========= */

async function sendTG(msg: string) {
  await axios.post(
    `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
    {
      chat_id: TG_CHAT_ID,
      text: msg,
      disable_web_page_preview: true,
    }
  );
}

/* ========= TRC20 API ========= */

async function fetchTRC20(limit = 20) {
  const url =
    `https://apilist.tronscan.org/api/filter/trc20/transfers` +
    `?limit=${limit}` +
    `&start=0` +
    `&sort=-timestamp` +
    `&count=true` +
    `&filterTokenValue=0` +
    `&relatedAddress=${WATCH_ADDRESS}`;

  const res = await axios.get<any>(url);
  return res.data?.token_transfers || [];
}

/* ========= TRC10 API ========= */

async function fetchTRC10(limit = 20) {
  const url =
    `https://apilist.tronscan.org/api/transaction` +
    `?sort=-timestamp` +
    `&count=true` +
    `&limit=${limit}` +
    `&start=0` +
    `&address=${WATCH_ADDRESS}`;

  const res = await axios.get<any>(url);
  return res.data?.data || [];
}


function formatTRC20(tx: any) {
  const token = tx.tokenInfo || {};
  const amount =
    Number(tx.quant) / Math.pow(10, token.tokenDecimal || 0);

  return `Incoming TRC20 Transfer

Token:
${token.tokenName} (${token.tokenAbbr})

Amount:
${amount.toLocaleString()}

From:
${tx.from_address}

To:
${tx.to_address}

TxHash:
${tx.transaction_id}

Time:
${new Date(tx.block_ts).toLocaleString()}
`;
}

function formatTRC10(tx: any) {
  const info = tx.contractData?.tokenInfo || {};
  const amount =
    Number(tx.contractData?.amount || 0) /
    Math.pow(10, info.tokenDecimal || 0);

  return `Incoming TRC10 Transfer

Token:
${info.tokenName} (${info.tokenAbbr})

Amount:
${amount.toLocaleString()}

From:
${tx.ownerAddress}

To:
${tx.toAddress}

TxHash:
${tx.hash}

Time:
${new Date(tx.timestamp).toLocaleString()}
`;
}



async function warmTRC20Cache() {
  console.log("Warming TRC20 cache...");

  const txs = await fetchTRC20(50);

  for (const tx of txs) {
    if (tx.transaction_id) {
      seenTRC20.add(tx.transaction_id);
    }
  }

  console.log(`TRC20 cache size = ${seenTRC20.size}\n`);
}

/* ========= 轮询 ========= */

async function poll() {
  try {
    /* ===== TRC20 ===== */

    const trc20 = await fetchTRC20(20);

    for (const tx of trc20) {
      if (!tx.transaction_id) continue;
      if (seenTRC20.has(tx.transaction_id)) continue;

      seenTRC20.add(tx.transaction_id);

      const msg = formatTRC20(tx);
      console.log(msg);
      await sendTG(msg);
    }

    /* ===== TRC10 ===== */

    const trc10 = await fetchTRC10(20);

    for (const tx of trc10) {
      if (tx.contractType !== 2) continue; // TRC10
      if (tx.toAddress !== WATCH_ADDRESS) continue;
      if (!tx.hash) continue;

      if (seenTRC10.has(tx.hash)) continue;
      seenTRC10.add(tx.hash);

      const msg = formatTRC10(tx);
      console.log(msg);
      await sendTG(msg);
  }

    

  } catch (e: any) {
    console.error("poll error:", e?.message || e);
  }
}

/* ========= 启动 ========= */

(async () => {
  console.log("TRC20 + TRC10 Monitor started...");
  await warmTRC20Cache();   // ✅ 只缓存 TRC20
  setInterval(poll, INTERVAL);
})();