import "server-only";
import { createClient, createKeyPairSignerFromBytes, lamports, type Address } from "@solana/kit";
import { solanaDevnetRpc } from "@solana/kit-plugin-rpc";
import { signer } from "@solana/kit-plugin-signer";
import { getAddMemoInstruction } from "@solana-program/memo";
import { getTransferSolInstruction } from "@solana-program/system";
import { toLamports } from "./payment";

// Cliente de Solana del servidor: paga recompensas y pólizas desde la wallet del
// servidor (SERVER_SECRET_KEY, generada por scripts/setup-devnet.mts). Solo devnet.

async function buildClient() {
  const secret = process.env.SERVER_SECRET_KEY;
  if (!secret) throw new Error("Falta SERVER_SECRET_KEY: corré `npm run setup:devnet`.");
  const server = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(secret)));
  return createClient()
    .use(signer(server))
    .use(
      solanaDevnetRpc({
        rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
        transactionConfig: { version: 1 },
      }),
    );
}

let clientPromise: ReturnType<typeof buildClient> | undefined;
export function serverClient() {
  clientPromise ??= buildClient();
  return clientPromise;
}

/** Transfiere SOL de devnet (monto en SOL, por ejemplo 0.005) y deja un memo en la misma transacción. */
export async function payWithMemo(recipient: Address, amount: number, memo: string): Promise<string> {
  const client = await serverClient();
  const transfer = getTransferSolInstruction({
    source: client.payer,
    destination: recipient,
    amount: lamports(toLamports(amount)),
  });
  const result = await client.sendTransaction([transfer, getAddMemoInstruction({ memo })]);
  return result.context.signature;
}

/** Solo un memo (por ejemplo, el hash del índice publicado). */
export async function writeMemo(memo: string): Promise<string> {
  const client = await serverClient();
  const result = await client.sendTransaction([getAddMemoInstruction({ memo })]);
  return result.context.signature;
}
