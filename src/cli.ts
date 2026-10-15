#!/usr/bin/env node
/**
 * CLI runner for Solana Devnet Account Watchlist & Viewer
 * Accepts multiple addresses, shows beautiful output, and isolates errors.
 */

import { inspectAccounts, DEFAULT_RPC_URL } from "./core/solana.js";

// ANSI color helpers
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

async function main() {
  const args = process.argv.slice(2);

  console.log(`\n${colors.bold}${colors.magenta}=== Solana Devnet Account Watchlist & Balance Viewer ===${colors.reset}`);
  console.log(`${colors.dim}Solana Campus Program UniUyo - Week 1 Assignment${colors.reset}`);
  console.log(`${colors.cyan}Cluster:${colors.reset} devnet`);
  
  const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL || DEFAULT_RPC_URL;
  const isCustomRpc = Boolean(process.env.SOLANA_DEVNET_RPC_URL);
  console.log(`${colors.cyan}RPC Endpoint:${colors.reset} ${isCustomRpc ? "Custom URL provided via SOLANA_DEVNET_RPC_URL" : DEFAULT_RPC_URL}\n`);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`${colors.yellow}Usage:${colors.reset}`);
    console.log(`  node dist/cli.js <ADDRESS_1> <ADDRESS_2> ... <ADDRESS_N>`);
    console.log(`  npm run cli <ADDRESS_1> <ADDRESS_2>\n`);
    console.log(`${colors.yellow}Example with System Program & Demo addresses:${colors.reset}`);
    console.log(`  npm run cli 11111111111111111111111111111111 TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA\n`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  console.log(`${colors.dim}Inspecting ${args.length} account(s)...${colors.reset}\n`);

  try {
    const results = await inspectAccounts(args, { rpcUrl, cluster: "devnet" });

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const indexNum = `[${i + 1}/${results.length}]`;

      console.log(`----------------------------------------------------------------`);
      if (res.success && res.exists) {
        const badge = res.executable ? `${colors.yellow}[EXECUTABLE PROGRAM]${colors.reset}` : `${colors.green}[DATA / WALLET ACCOUNT]${colors.reset}`;
        console.log(`${colors.bold}${indexNum} ${res.address}${colors.reset} ${badge}`);
        if (res.knownLabel) {
          console.log(`  ${colors.magenta}Label:${colors.reset} ${res.knownLabel}`);
        }
        console.log(`  ${colors.green}Balance:${colors.reset} ${colors.bold}${res.solFormatted} SOL${colors.reset} (${res.lamports?.toLocaleString()} lamports)`);
        console.log(`  ${colors.blue}Owner:${colors.reset} ${res.owner} ${res.ownerLabel ? `(${res.ownerLabel})` : ""}`);
        console.log(`  ${colors.blue}Data Size:${colors.reset} ${res.dataSize} bytes`);
        console.log(`  ${colors.dim}Explorer:${colors.reset} ${res.explorerUrl}`);
      } else if (res.success && !res.exists) {
        console.log(`${colors.bold}${indexNum} ${res.address}${colors.reset} ${colors.yellow}[UNFUNDED / NO DATA]${colors.reset}`);
        console.log(`  ${colors.yellow}Status:${colors.reset} Valid Solana address, but no onchain account created or funded yet.`);
        console.log(`  ${colors.green}Balance:${colors.reset} 0 SOL (0 lamports)`);
        console.log(`  ${colors.dim}Explorer:${colors.reset} ${res.explorerUrl}`);
      } else {
        console.log(`${colors.bold}${indexNum} ${res.address}${colors.reset} ${colors.red}[LOOKUP FAILED]${colors.reset}`);
        console.log(`  ${colors.red}Reason:${colors.reset} ${res.error}`);
        console.log(`  ${colors.dim}Explorer:${colors.reset} ${res.explorerUrl}`);
      }
    }

    console.log(`----------------------------------------------------------------\n`);
    const successful = results.filter((r) => r.success).length;
    console.log(`${colors.bold}Summary:${colors.reset} Checked ${results.length} addresses. (${successful} succeeded, ${results.length - successful} invalid/failed)\n`);
  } catch (globalErr: any) {
    console.error(`${colors.red}Fatal network error:${colors.reset}`, globalErr.message);
    process.exit(1);
  }
}

main();
