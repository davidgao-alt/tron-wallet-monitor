import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import axios from "axios";

const WATCH_ADDRESS = "";
const TG_BOT_TOKEN = "";
const TG_CHAT_ID = "";

const INTERVAL = 60_000;

const seenTRC20 = new Set<string>();
const seenTRC10 = new Set<string>();


async function sendTG(msg: string) {
  await axios.post(
    `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
    {
      chat_id: TG_CHAT_ID,
      text: msg,
      disable_web_page_preview: true,
    },
    { timeout: 10000 }
  );
}

async function fetchTRC20(limit = 20) {
  const url =
    `https://apilist.tronscan.org/api/filter/trc20/transfers` +
    `?limit=${limit}` +
    `&start=0` +
    `&sort=-timestamp` +
    `&count=true` +
    `&filterTokenValue=0` +
    `&relatedAddress=${WATCH_ADDRESS}`;

  const res = await axios.get<any>(url, { timeout: 10000 });
  return res.data?.token_transfers || [];
}

async function fetchTRC10(limit = 20) {
  const url =
    `https://apilist.tronscan.org/api/transaction` +
    `?sort=-timestamp` +
    `&count=true` +
    `&limit=${limit}` +
    `&start=0` +
    `&address=${WATCH_ADDRESS}`;

  const res = await axios.get<any>(url, { timeout: 10000 });
  return res.data?.data || [];
}


function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toISOString();
}


function formatTRC20(tx: any) {
  const token = tx.tokenInfo || {};
  const amount =
    Number(tx.quant) / Math.pow(10, token.tokenDecimal || 0);

  return `Incoming TRC20 Transfer
Token: ${token.tokenName} (${token.tokenAbbr})
Amount: ${amount}
From: ${tx.from_address}
To: ${tx.to_address}
Hash: ${tx.transaction_id}
Time: ${formatTime(tx.block_ts)}
`;
}

function formatTRC10(tx: any) {
  const info = tx.contractData?.tokenInfo || {};
  const amount =
    Number(tx.contractData?.amount || 0) /
    Math.pow(10, info.tokenDecimal || 0);

  return `Incoming TRC10 Transfer
Token: ${info.tokenName} (${info.tokenAbbr})
Amount: ${amount}
From: ${tx.ownerAddress}
To: ${tx.toAddress}
Hash: ${tx.hash}
Time: ${formatTime(tx.timestamp)}
`;
}


async function poll() {
  try {
    const trc20 = await fetchTRC20(20);
    const trc10 = await fetchTRC10(20);

    for (const tx of trc20) {
      if (!tx.transaction_id) continue;
      if (tx.to_address !== WATCH_ADDRESS) continue;
      if (seenTRC20.has(tx.transaction_id)) continue;

      seenTRC20.add(tx.transaction_id);
      await sendTG(formatTRC20(tx));
    }

    for (const tx of trc10) {
      if (tx.contractType !== 2) continue;
      if (tx.toAddress !== WATCH_ADDRESS) continue;
      if (!tx.hash) continue;
      if (seenTRC10.has(tx.hash)) continue;

      seenTRC10.add(tx.hash);
      await sendTG(formatTRC10(tx));
    }

  } catch (e: any) {
    console.error("poll error:", e?.message || e);
  }
}

(async () => {
  console.log("TRC20 + TRC10 Monitor started...");

  const trc20 = await fetchTRC20(50);
  const trc10 = await fetchTRC10(50);


  const latest20 = trc20.find(
    (tx: any) =>
      tx.to_address === WATCH_ADDRESS &&
      tx.transaction_id
  );

  const latest10 = trc10.find(
    (tx: any) =>
      tx.contractType === 2 &&
      tx.toAddress === WATCH_ADDRESS &&
      tx.hash
  );

  if (latest20) {
    console.log("Latest TRC20 (terminal only):\n");
    console.log(formatTRC20(latest20));
  } else if (latest10) {
    console.log("Latest TRC10 (terminal only):\n");
    console.log(formatTRC10(latest10));
  } else {
    console.log("No recent incoming transactions found.");
  }


  trc20.forEach((tx: any) => tx.transaction_id && seenTRC20.add(tx.transaction_id));
  trc10.forEach((tx: any) => tx.hash && seenTRC10.add(tx.hash));


  await sendTG("${content}");


  setInterval(poll, INTERVAL);
})();