/**
 * Solana Account Viewer Core Logic
 * Works in both Node.js (CLI) and modern browsers (Web Dashboard)
 */

export const DEFAULT_RPC_URL = "https://api.devnet.solana.com";
export const LAMPORTS_PER_SOL = 1_000_000_000n;

// Well-known core program public keys
export const KNOWN_ACCOUNTS: Record<string, string> = {
  "11111111111111111111111111111111": "System Program (Native Core)",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "SPL Token Program",
  "Vote111111111111111111111111111111111111111": "Vote Program",
  "Config1111111111111111111111111111111111111": "Config Program",
  "Stake11111111111111111111111111111111111111": "Stake Program",
  "BPFLoaderUpgradeab1e11111111111111111111111": "BPF Upgradeable Loader",
};

export interface RawAccountInfo {
  lamports: number;
  owner: string;
  executable: boolean;
  rentEpoch?: number;
  data?: [string, string] | any;
  space?: number;
}

export interface AccountViewResult {
  address: string;
  success: boolean;
  cluster: string;
  explorerUrl: string;
  knownLabel?: string;
  exists?: boolean;
  lamports?: number;
  solFormatted?: string;
  owner?: string;
  ownerLabel?: string;
  executable?: boolean;
  dataSize?: number;
  error?: string;
}

/**
 * Validates whether a given string adheres to Solana public address format (Base58, 32-44 characters).
 */
export function validateAddress(address: string): string {
  if (typeof address !== "string") {
    throw new Error("Address must be a string.");
  }
  const trimmed = address.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    throw new Error(`Invalid Solana address format (${trimmed.slice(0, 8)}...): Must be Base58 and 32-44 characters.`);
  }
  return trimmed;
}

/**
 * Formats lamports to SOL using BigInt math to avoid floating-point rounding errors.
 */
export function formatSol(lamports: number | bigint): string {
  const amount = BigInt(lamports);
  if (amount < 0n) {
    throw new Error("Lamport amount cannot be negative.");
  }
  const whole = amount / LAMPORTS_PER_SOL;
  const fraction = String(amount % LAMPORTS_PER_SOL).padStart(9, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

/**
 * Fetches single account details via JSON-RPC getAccountInfo
 */
export async function getAccountInfo(
  address: string,
  options: { rpcUrl?: string; fetchImpl?: typeof fetch } = {}
): Promise<RawAccountInfo | null> {
  const validated = validateAddress(address);
  const rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
  const fetchImpl = options.fetchImpl || fetch;

  const response = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [validated, { encoding: "base64", commitment: "confirmed" }],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}: ${response.statusText || "Service Unavailable"}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(`RPC Error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  if (!json.result || !Object.hasOwn(json.result, "value")) {
    throw new Error("RPC returned an unexpected structure.");
  }

  return json.result.value as RawAccountInfo | null;
}

/**
 * Fetches multiple accounts in a single batch call via getMultipleAccounts
 * Meets stretch criteria from Week 1 Solana curriculum!
 */
export async function getMultipleAccounts(
  addresses: string[],
  options: { rpcUrl?: string; fetchImpl?: typeof fetch } = {}
): Promise<Array<RawAccountInfo | null>> {
  const rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
  const fetchImpl = options.fetchImpl || fetch;

  const response = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getMultipleAccounts",
      params: [addresses, { encoding: "base64", commitment: "confirmed" }],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(`RPC Error: ${json.error.message}`);
  }

  if (!json.result || !Array.isArray(json.result.value)) {
    throw new Error("RPC returned an unexpected response structure for getMultipleAccounts.");
  }

  return json.result.value;
}

/**
 * High-level inspector that handles validation, single & batch queries,
 * and isolates errors so one failure does not compromise other accounts.
 */
export async function inspectAccounts(
  addresses: string[],
  options: { rpcUrl?: string; cluster?: string; fetchImpl?: typeof fetch } = {}
): Promise<AccountViewResult[]> {
  const cluster = options.cluster || "devnet";
  const rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
  const fetchImpl = options.fetchImpl || fetch;

  // Clean and pre-validate addresses
  const parsed = addresses.map((raw) => {
    try {
      const valid = validateAddress(raw);
      return { raw, valid, error: null };
    } catch (err: any) {
      return { raw, valid: null, error: err.message };
    }
  });

  const validEntries = parsed.filter((p) => p.valid !== null);

  // Attempt batch getMultipleAccounts if there are valid addresses
  let batchResults: (RawAccountInfo | null)[] = [];
  let batchFailed = false;

  if (validEntries.length > 0) {
    try {
      const validKeys = validEntries.map((e) => e.valid as string);
      batchResults = await getMultipleAccounts(validKeys, { rpcUrl, fetchImpl });
    } catch (err) {
      // If batch fails, fallback to individual settled requests
      batchFailed = true;
    }
  }

  let validIndex = 0;
  const results: AccountViewResult[] = [];

  for (const item of parsed) {
    const explorerUrl = `https://explorer.solana.com/address/${item.raw}?cluster=${cluster}`;

    if (item.error || !item.valid) {
      results.push({
        address: item.raw,
        success: false,
        cluster,
        explorerUrl,
        error: item.error || "Invalid address format",
      });
      continue;
    }

    const validAddress = item.valid;
    const knownLabel = KNOWN_ACCOUNTS[validAddress];

    try {
      let rawInfo: RawAccountInfo | null = null;

      if (!batchFailed && batchResults.length > validIndex) {
        rawInfo = batchResults[validIndex];
      } else {
        // Individual fallback
        rawInfo = await getAccountInfo(validAddress, { rpcUrl, fetchImpl });
      }

      validIndex++;

      if (rawInfo === null) {
        results.push({
          address: validAddress,
          success: true,
          cluster,
          explorerUrl,
          knownLabel,
          exists: false,
          lamports: 0,
          solFormatted: "0",
          error: "No onchain account found yet (unfunded)",
        });
      } else {
        const ownerLabel = KNOWN_ACCOUNTS[rawInfo.owner] || undefined;
        let dataSize = 0;
        if (Array.isArray(rawInfo.data) && typeof rawInfo.data[0] === "string") {
          // base64 decoded size calculation
          dataSize = Math.floor((rawInfo.data[0].length * 3) / 4);
        }

        results.push({
          address: validAddress,
          success: true,
          cluster,
          explorerUrl,
          knownLabel,
          exists: true,
          lamports: rawInfo.lamports,
          solFormatted: formatSol(rawInfo.lamports),
          owner: rawInfo.owner,
          ownerLabel,
          executable: rawInfo.executable,
          dataSize: rawInfo.space ?? dataSize,
        });
      }
    } catch (err: any) {
      validIndex++;
      results.push({
        address: validAddress,
        success: false,
        cluster,
        explorerUrl,
        knownLabel,
        error: err.message || "Failed to fetch account info from RPC",
      });
    }
  }

  return results;
}
