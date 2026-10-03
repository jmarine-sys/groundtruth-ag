import "server-only";
import { createClient, createKeyPairSignerFromBytes, lamports, type Address, type Instruction } from "@solana/kit";
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

/** El RPC público de devnet limita los pedidos (429): se reintenta con espera creciente. */
function isRateLimited(error: unknown): boolean {
  for (let e = error as { message?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.message?.includes("429")) return true;
  }
  return false;
}

/** Firma que Kit incluye en el error cuando la transacción ya se firmó: "Failed to send transaction (<firma>)". */
function signatureFrom(error: unknown): string | undefined {
  const match = (error as Error)?.message?.match(/\(([1-9A-HJ-NP-Za-km-z]{64,90})\)/);
  return match?.[1];
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function send(instructions: Instruction[]): Promise<string> {
  const client = await serverClient();
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await client.sendTransaction(instructions);
      return result.context.signature;
    } catch (error) {
      if (!isRateLimited(error) || attempt >= 3) throw error;
      // Antes de reenviar, comprobar si la transacción fallida igual entró: si no, se pagaría dos veces.
      const signature = signatureFrom(error);
      if (signature) {
        for (let check = 0; check < 3; check++) {
          await wait(2000);
          const { value } = await client.rpc
            .getSignatureStatuses([signature as Parameters<typeof client.rpc.getSignatureStatuses>[0][number]], {
              searchTransactionHistory: true,
            })
            .send()
            .catch(() => ({ value: [null] }));
          if (value[0] && !value[0].err) return signature;
        }
      }
      await wait(1500 * 2 ** attempt);
    }
  }
}

async function transfer(recipient: Address, amount: number) {
  const client = await serverClient();
  return getTransferSolInstruction({
    source: client.payer,
    destination: recipient,
    amount: lamports(toLamports(amount)),
  });
}

/** Transfiere SOL de devnet (monto en SOL, por ejemplo 0.005) y deja un memo en la misma transacción. */
export async function payWithMemo(recipient: Address, amount: number, memo: string): Promise<string> {
  return send([await transfer(recipient, amount), getAddMemoInstruction({ memo })]);
}

/**
 * Varios pagos y un memo en una sola transacción: menos pedidos al RPC público y un solo
 * movimiento en el explorador. Cinco transferencias más un memo entran de sobra en una v1.
 */
export async function payManyWithMemo(
  payments: { recipient: Address; amount: number }[],
  memo: string,
): Promise<string> {
  const transfers = await Promise.all(payments.map((p) => transfer(p.recipient, p.amount)));
  return send([getAddMemoInstruction({ memo }), ...transfers]);
}
