// Prepara devnet para la demo (solo devnet: la plata es de mentira).
// - Crea (o reutiliza) la wallet del servidor que paga recompensas y pólizas.
// - Le pide SOL de prueba al faucet de devnet.
// - Muestra el saldo de SOL de devnet del servidor (los pagos de la demo son en SOL).
// - Genera 4 direcciones de informantes precargados y 1 de productor asegurado.
// Escribe en .env.local (en .gitignore) solo lo que no esté ya en el .env compartido. Nunca imprime claves privadas.
//
// Uso: npm run setup:devnet

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  createClient,
  createKeyPairSignerFromBytes,
  generateKeyPairSigner,
  lamports,
} from "@solana/kit";
import { solanaDevnetRpc } from "@solana/kit-plugin-rpc";
import { signer } from "@solana/kit-plugin-signer";

const ENV_FILE = ".env.local";

function readEnv(file = ENV_FILE): Map<string, string> {
  const env = new Map<string, string>();
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env.set(match[1], match[2]);
  }
  return env;
}

// Valores públicos compartidos por el equipo (versionados en .env). Si ya están ahí,
// no se generan de nuevo: todos usan los mismos informantes y el mismo asegurado.
const shared = readEnv(".env");

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

// Los pagos de la demo son en SOL de devnet (lib/payment.ts): cada recorrido usa ~0,07 SOL.
const { value: after } = await client.rpc.getBalance(server.address).send();
console.log(`SOL de devnet en la wallet del servidor: ${Number(after) / 1e9}`);

if (!env.get("NEXT_PUBLIC_SEED_WALLETS") && !shared.get("NEXT_PUBLIC_SEED_WALLETS")) {
  // Solo hacen falta las direcciones: estos informantes no firman, solo cobran.
  const seeds = await Promise.all(Array.from({ length: 4 }, () => generateKeyPairSigner()));
  env.set("NEXT_PUBLIC_SEED_WALLETS", seeds.map((s) => s.address).join(","));
}
if (!env.get("NEXT_PUBLIC_INSURED_WALLET") && !shared.get("NEXT_PUBLIC_INSURED_WALLET")) {
  env.set("NEXT_PUBLIC_INSURED_WALLET", (await generateKeyPairSigner()).address);
}
env.set("NEXT_PUBLIC_SERVER_WALLET", server.address);
writeEnv(env);

console.log("Listo. Variables escritas en .env.local:");
for (const key of ["NEXT_PUBLIC_SERVER_WALLET", "NEXT_PUBLIC_SEED_WALLETS", "NEXT_PUBLIC_INSURED_WALLET"]) {
  console.log(`  ${key}=${env.get(key) ?? shared.get(key)}`);
}
