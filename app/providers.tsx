"use client";

import type { ReactNode } from "react";
import { createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";
import { ClientProvider } from "@solana/react";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

// Un solo cliente para la app; la wallet conectada (Phantom en devnet) firma y paga.
// version: 0 a propósito: el memo entra de sobra en 1232 bytes y así no dependemos de
// que la wallet ya soporte transacciones v1.
export const client = createClient()
  .use(walletSigner({ chain: "solana:devnet" }))
  .use(solanaRpc({ rpcUrl, transactionConfig: { version: 0 } }));

export type AppClient = Awaited<typeof client>;

export function Providers({ children }: { children: ReactNode }) {
  return <ClientProvider client={client}>{children}</ClientProvider>;
}
