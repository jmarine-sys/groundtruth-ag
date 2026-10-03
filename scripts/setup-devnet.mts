// Prepara devnet para la demo (solo devnet: la plata es de mentira).
// - Crea (o reutiliza) la wallet del servidor que paga recompensas y pólizas.
// - Le pide SOL de prueba al faucet de devnet.
// - Muestra el saldo de USDC de devnet del servidor (los pagos son en USDC).
// - Genera 4 direcciones de informantes precargados y 1 de productor asegurado.
// Escribe todo en .env.local, que está en .gitignore. Nunca imprime claves privadas.
//
// Uso: npm run setup:devnet

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  createClient,
  createKeyPairSignerFromBytes,
  address,
  generateKeyPairSigner,
  lamports,
} from "@solana/kit";
import { solanaDevnetRpc } from "@solana/kit-plugin-rpc";
import { signer } from "@solana/kit-plugin-signer";

const ENV_FILE = ".env.local";

function readEnv(): Map<string, string> {
  const env = new Map<string, string>();
  if (!existsSync(ENV_FILE)) return env;
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env.set(match[1], match[2]);
  }
  return env;
}

function writeEnv(env: Map<string, string>) {
  const body = [...env].map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  writeFileSync(ENV_FILE, body, { mode: 0o600 });
}

async function exportableSigner() {
  // extractable=true para poder guardar la clave en .env.local
  const kp = await generateKeyPairSigner(true);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.keyPair.privateKey));
  const secret = pkcs8.slice(-32); // los últimos 32 bytes del PKCS#8 de Ed25519 son la semilla
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.keyPair.publicKey));
  return { signer: kp, bytes: new Uint8Array([...secret, ...pub]) };
}

const env = readEnv();

let server;
if (env.get("SERVER_SECRET_KEY")) {
  server = await createKeyPairSignerFromBytes(
    new Uint8Array(JSON.parse(env.get("SERVER_SECRET_KEY")!)),
  );
  console.log("Wallet del servidor reutilizada:", server.address);
} else {
  const created = await exportableSigner();
  server = created.signer;
  env.set("SERVER_SECRET_KEY", JSON.stringify([...created.bytes]));
  writeEnv(env);
  console.log("Wallet del servidor creada:", server.address);
}

const rpcUrl = env.get("SOLANA_RPC_URL") || "https://api.devnet.solana.com";
const client = await createClient()
  .use(signer(server))
  .use(solanaDevnetRpc({ rpcUrl, transactionConfig: { version: 1 } }));

const { value: balance } = await client.rpc.getBalance(server.address).send();
if (balance < lamports(BigInt(200_000_000))) {
  try {
    await client.airdrop(server.address, lamports(BigInt(1_000_000_000)));
    console.log("Airdrop de 1 SOL de prueba recibido.");
  } catch {
    console.error(
      `El faucet de devnet rechazó el airdrop. Cargá SOL de prueba a mano en https://faucet.solana.com para ${server.address} y volvé a correr el script.`,
    );
    process.exit(1);
  }
}

// Los pagos son en USDC de devnet (lib/payment.ts). El servidor necesita saldo:
// se pide gratis en https://faucet.circle.com eligiendo "Solana Devnet".
const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const { value: tokenAccounts } = await client.rpc
  .getTokenAccountsByOwner(server.address, { mint: address(USDC_DEVNET) }, { encoding: "jsonParsed" })
  .send();
const usdc = tokenAccounts.reduce(
  (sum, a) => sum + Number(a.account.data.parsed.info.tokenAmount.uiAmount ?? 0),
  0,
);
console.log(`USDC de devnet en la wallet del servidor: ${usdc}`);
if (usdc < 5) {
  console.log(
    `Cargá USDC de prueba en https://faucet.circle.com (red "Solana Devnet") para ${server.address}. Cada ronda de la demo usa ~3 USDC.`,
  );
}

if (!env.get("NEXT_PUBLIC_SEED_WALLETS")) {
  // Solo hacen falta las direcciones: estos informantes no firman, solo cobran.
  const seeds = await Promise.all(Array.from({ length: 4 }, () => generateKeyPairSigner()));
  env.set("NEXT_PUBLIC_SEED_WALLETS", seeds.map((s) => s.address).join(","));
}
if (!env.get("NEXT_PUBLIC_INSURED_WALLET")) {
  env.set("NEXT_PUBLIC_INSURED_WALLET", (await generateKeyPairSigner()).address);
}
env.set("NEXT_PUBLIC_SERVER_WALLET", server.address);
writeEnv(env);

console.log("Listo. Variables escritas en .env.local:");
for (const key of ["NEXT_PUBLIC_SERVER_WALLET", "NEXT_PUBLIC_SEED_WALLETS", "NEXT_PUBLIC_INSURED_WALLET"]) {
  console.log(`  ${key}=${env.get(key)}`);
}
