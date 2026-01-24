import { TronWeb } from "tronweb";
import axios from "axios";
import "dotenv/config";

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN!;
const TG_CHAT_ID = process.env.TG_CHAT_ID!;
const TRON_RPC = process.env.TRON_RPC || "https://api.trongrid.io";

const tronWeb = new TronWeb({
  fullHost: TRON_RPC
});

function sunToTRX(n: number) {
  return Number(tronWeb.fromSun(n || 0));
}

async function sendTG(msg: string) {
  const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TG_CHAT_ID,
    text: msg,
    parse_mode: "Markdown"
  });
}

(async () => {
  const address = "TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N";
  const acc: any = await tronWeb.trx.getAccount(address);

  const available = sunToTRX(acc?.balance || 0);

  const frozenArr = Array.isArray(acc?.frozen) ? acc.frozen : [];
  const stake1Array = frozenArr.reduce(
    (s: number, f: any) => s + (f?.frozen_balance || 0),
    0
  );
  const legacyEnergy =
    acc?.account_resource?.frozen_balance_for_energy?.frozen_balance || 0;
  const stake1Total = stake1Array + legacyEnergy;

  let v2Self = 0;
  if (Array.isArray(acc?.frozenV2)) {
    for (const f of acc.frozenV2) v2Self += f?.amount || 0;
  }

  const dr = acc?.delegated_resource || {};
  const v2DelegOut =
    (dr?.acquired_delegated_balance_for_bandwidth || 0) +
    (dr?.acquired_delegated_balance_for_energy || 0);

  const frozenAll = sunToTRX(stake1Total + v2Self + v2DelegOut);
  const total = (available + frozenAll).toFixed(6);

  const msg = `📊 *Tron Wallet Balance Snapshot*

*Address*
\`${address}\`

*Available*
${available.toLocaleString()} TRX

*Frozen*
• Stake 1.0: ${sunToTRX(stake1Total).toLocaleString()} TRX  
• Stake 2.0 Self: ${sunToTRX(v2Self).toLocaleString()} TRX  
• Stake 2.0 Delegated: ${sunToTRX(v2DelegOut).toLocaleString()} TRX  

*Frozen Total*
${frozenAll.toLocaleString()} TRX

--------------------------------
*Total Balance*
${Number(total).toLocaleString()} TRX

*Snapshot Time*
${new Date().toLocaleString()}
`;

  console.log(msg);
  await sendTG(msg);
  process.exit(0);
})();

// import { TronWeb } from "tronweb";
// import axios from "axios";

// const tronWeb = new TronWeb({
//   fullHost: "https://api.trongrid.io"
// });


// const TG_BOT_TOKEN = "";
// const TG_CHAT_ID = "";


// function sunToTRX(n: number) {
//   return Number(tronWeb.fromSun(n || 0));
// }

// async function sendTG(msg: string) {
//   const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
//   await axios.post(url, {
//     chat_id: TG_CHAT_ID,
//     text: msg,
//     parse_mode: "Markdown"
//   });
// }

// (async () => {
//   const address = "";
//   const acc: any = await tronWeb.trx.getAccount(address);

//   // Available
//   const available = sunToTRX(acc?.balance || 0);

//   // Stake 1.0
//   const frozenArr = Array.isArray(acc?.frozen) ? acc.frozen : [];
//   const stake1Array = frozenArr.reduce(
//     (s: number, f: any) => s + (f?.frozen_balance || 0),
//     0
//   );
//   const legacyEnergy =
//     acc?.account_resource?.frozen_balance_for_energy?.frozen_balance || 0;
//   const stake1Total = stake1Array + legacyEnergy;

//   // Stake 2.0 (self)
//   let v2Self = 0;
//   if (Array.isArray(acc?.frozenV2)) {
//     for (const f of acc.frozenV2) v2Self += f?.amount || 0;
//   }

//   // Stake 2.0 (delegated out)
//   const dr = acc?.delegated_resource || {};
//   const v2DelegOut =
//     (dr?.acquired_delegated_balance_for_bandwidth || 0) +
//     (dr?.acquired_delegated_balance_for_energy || 0);

//   // Frozen total
//   const frozenAll = sunToTRX(stake1Total + v2Self + v2DelegOut);

//   // Sum check
//   const total = (available + frozenAll).toFixed(6);

//   const msg = `📊 *Tron Wallet Balance Snapshot*

// *Address*
// \`${address}\`

// *Available*
// ${available.toLocaleString()} TRX

// *Frozen*
// • Stake 1.0: ${sunToTRX(stake1Total).toLocaleString()} TRX  
// • Stake 2.0 Self: ${sunToTRX(v2Self).toLocaleString()} TRX  
// • Stake 2.0 Delegated: ${sunToTRX(v2DelegOut).toLocaleString()} TRX  

// *Frozen Total*
// ${frozenAll.toLocaleString()} TRX

// --------------------------------
// *Total Balance*
// ${Number(total).toLocaleString()} TRX

// *Snapshot Time*
// ${new Date().toLocaleString()}
// `;

//   console.log(msg);

//   await sendTG(msg);

//   process.exit(0);
// })();

