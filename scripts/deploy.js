/**
 * RemoteChain - Automated Deployment Script
 * 
 * Usage:
 *   node scripts/deploy.js [network]
 * 
 * Examples:
 *   node scripts/deploy.js localhost    (deploy to local Hardhat node)
 *   node scripts/deploy.js sepolia      (deploy to Sepolia testnet)
 * 
 * This script will:
 *   1. Compile the contract
 *   2. Deploy it to the specified network
 *   3. Auto-update the contract address in App.jsx
 *   4. Copy the ABI artifact to src/
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const NETWORK = process.argv[2] || "localhost";

const NETWORK_CONFIG = {
   localhost: {
      rpc: "http://127.0.0.1:8545",
      name: "Localhost (Hardhat)",
   },
   shardeum: {
      rpc: process.env.SHARDEUM_RPC_URL || "https://api-mezame.shardeum.org",
      name: "Shardeum EVM Testnet",
   },
};

async function main() {
   const config = NETWORK_CONFIG[NETWORK];
   if (!config) {
      console.error(`Unknown network: ${NETWORK}`);
      console.error(`Available networks: ${Object.keys(NETWORK_CONFIG).join(", ")}`);
      process.exit(1);
   }

   if (!config.rpc || config.rpc.includes("YOUR_")) {
      console.error(`Please set the RPC URL for ${NETWORK} in your .env file.`);
      process.exit(1);
   }

   console.log("============================================");
   console.log("  RemoteChain - Automated Deployment");
   console.log("============================================");
   console.log(`Network:  ${config.name}`);
   console.log(`RPC URL:  ${config.rpc}`);
   console.log("");

   // Step 1: Compile
   console.log("[1/4] Compiling smart contract...");
   try {
      execSync("npx hardhat compile --force", { stdio: "inherit", cwd: path.join(__dirname, "..") });
   } catch (e) {
      console.error("Compilation failed!");
      process.exit(1);
   }
   console.log("Compilation successful!\n");

   // Step 2: Deploy
   console.log("[2/4] Deploying contract...");
   const provider = new ethers.providers.JsonRpcProvider(config.rpc);

   let signer;
   if (NETWORK === "localhost") {
      signer = provider.getSigner(0);
   } else {
      if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY.includes("your_")) {
         console.error("Please set PRIVATE_KEY in your .env file.");
         process.exit(1);
      }
      signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
   }

   const signerAddress = await signer.getAddress();
   const balance = await provider.getBalance(signerAddress);
   console.log(`  Deployer: ${signerAddress}`);
   console.log(`  Balance:  ${ethers.utils.formatEther(balance)} ETH`);

   if (balance.eq(0)) {
      console.error("  ERROR: Deployer has 0 ETH. Get test ETH from a faucet.");
      process.exit(1);
   }

   const artifactPath = path.join(__dirname, "../artifacts/contracts/RemoteVoting.sol/RemoteVoting.json");
   const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
   const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);

   const contract = await factory.deploy();
   await contract.deployed();

   const contractAddress = contract.address;
   console.log(`  Contract: ${contractAddress}`);
   console.log("Deployment successful!\n");

   // Step 3: Update App.jsx with new contract address
   console.log("[3/4] Updating frontend with contract address...");
   const appJsxPath = path.join(__dirname, "../src/App.jsx");
   let appContent = fs.readFileSync(appJsxPath, "utf8");
   appContent = appContent.replace(
      /const CONTRACT_ADDRESS = ".*?";/,
      `const CONTRACT_ADDRESS = "${contractAddress}";`
   );
   fs.writeFileSync(appJsxPath, appContent);
   console.log(`  Updated App.jsx with address: ${contractAddress}\n`);

   // Step 4: Copy ABI to src/
   console.log("[4/4] Copying ABI artifact to frontend...");
   const destPath = path.join(__dirname, "../src/RemoteVoting.json");
   fs.copyFileSync(artifactPath, destPath);
   console.log("  Copied RemoteVoting.json to src/\n");

   // Summary
   console.log("============================================");
   console.log("  Deployment Complete!");
   console.log("============================================");
   console.log(`  Network:  ${config.name}`);
   console.log(`  Contract: ${contractAddress}`);
   console.log(`  Deployer: ${signerAddress}`);
   console.log("");

   if (NETWORK === "localhost") {
      console.log("  Next: Run 'npm run dev' to start the frontend.");
   } else {
      console.log("  Next: Run 'npm run build' then deploy dist/ to Vercel.");
      console.log(`  Verify: https://sepolia.etherscan.io/address/${contractAddress}`);
   }
   console.log("============================================");
}

main().catch((error) => {
   console.error("Deployment failed:", error.message);
   process.exit(1);
});
