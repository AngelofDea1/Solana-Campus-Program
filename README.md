# Solana Devnet Account Viewer

Built for the **Solana Campus Program (UniUyo) Week 1 Take-Home Assignment**.

Inspects one or more Solana wallet or program addresses on Devnet. Runs as a terminal CLI tool and as an interactive web dashboard.

---

## What it does

- Takes any number of Solana public addresses as input
- Hits the Devnet RPC in a single batch call (`getMultipleAccounts`)
- Returns SOL balance, lamports, account type (executable program vs data account vs unfunded), owner program, and a direct Solana Explorer link
- Isolates failures: a bad address or failed lookup does not break results for the other addresses
- Uses `BigInt` throughout for lamport math to avoid floating-point rounding issues

---

## Requirements

- Node.js v20 or newer
- Internet access (connects to `https://api.devnet.solana.com`)

---

## Setup

```bash
git clone https://github.com/AngelofDea1/Solana-Campus-Program.git
cd Solana-Campus-Program
npm install
npm run build
```

The `npm run build` step compiles TypeScript into `public/dist/`. You only need to do this once (or again after editing TypeScript files).

---

## CLI

```bash
npm run cli <ADDRESS_1> <ADDRESS_2> ... <ADDRESS_N>
```

Example:

```bash
npm run cli 11111111111111111111111111111111 TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA bad_address_example
```

Sample output:

```
=== Solana Devnet Account Viewer ===
Solana Campus Program UniUyo -- Week 1
Cluster: devnet
RPC: https://api.devnet.solana.com

Inspecting 3 account(s)...

----------------------------------------------------------------
[1/3] 11111111111111111111111111111111 [EXECUTABLE PROGRAM]
  Label: System Program (Native Core)
  Balance: 0.000000001 SOL (1 lamports)
  Owner: NativeLoader1111111111111111111111111111111
  Data Size: 14 bytes
  Explorer: https://explorer.solana.com/address/11111111111111111111111111111111?cluster=devnet
----------------------------------------------------------------
[2/3] TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA [EXECUTABLE PROGRAM]
  Label: SPL Token Program
  Balance: 20.381267856 SOL (20,381,267,856 lamports)
  Owner: BPFLoaderUpgradeab1e11111111111111111111111 (BPF Upgradeable Loader)
  Data Size: 36 bytes
  Explorer: https://explorer.solana.com/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA?cluster=devnet
----------------------------------------------------------------
[3/3] bad_address_example [LOOKUP FAILED]
  Reason: Invalid Solana address format (bad_addr...): Must be Base58 and 32-44 characters.
----------------------------------------------------------------

Summary: 3 checked. 2 succeeded, 1 invalid/failed.
```

---

## Web Dashboard

To run the web interface locally:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

- Quick sample buttons let you test System Program, SPL Token Program, or a multi-address batch with one click.
- Enter any custom Solana address or list of addresses to inspect live state on Devnet.

---

## Tests

```bash
# Run against compiled output
npm test

# Run directly from TypeScript source (no build needed)
npm run test:src
```

The test suite uses Node's built-in `node:test` runner. It covers:

- Base58 address validation (valid addresses, whitespace trimming, invalid characters, short/long addresses)
- SOL formatting via BigInt (zero, 1 SOL, fractions, negative rejection)
- Error isolation in `inspectAccounts` (a bad address in the batch does not kill valid results)

---

## Custom RPC

If the public Devnet RPC is rate-limiting you (HTTP 429), set a custom endpoint:

```bash
export SOLANA_DEVNET_RPC_URL="https://your-devnet-rpc.com"
npm run cli <ADDRESS>
```

Free Devnet RPC options: Alchemy, QuickNode, Helius.

---

## Project structure

```
src/
  core/solana.ts        -- core RPC logic, address validation, SOL formatting
  cli.ts                -- CLI entry point
  test/
    account-viewer.test.ts -- unit tests
public/
  index.html            -- web dashboard
  style.css             -- stylesheet
  app.js                -- frontend script
server.mjs              -- static file server for the dashboard
```

---

## What I learned

1. **Everything is an account.** Programs on Solana are just accounts with `executable: true`, owned by a BPF loader. Wallets are accounts too. There is no special wallet type at the protocol level.

2. **An address is not the same as an account.** A valid Base58 public key can exist as a cryptographic identity without any onchain account behind it. The account only comes into existence when SOL is sent to it or a program initializes it.

3. **Lamport math needs BigInt.** 1 SOL = 1,000,000,000 lamports. JavaScript floats lose precision at that scale. Using `BigInt` for all lamport arithmetic avoids rounding errors in balance display.

4. **`getMultipleAccounts` is better than looping.** Batching multiple addresses into one RPC call cuts network overhead significantly and is less likely to hit rate limits compared to firing one request per address.

---

## License

MIT. Built for **Solana Campus Program UniUyo**.
