require("dotenv").config();

const networks = {
   localhost: {
      url: "http://127.0.0.1:8545",
   },
};

// Add Shardeum testnet if credentials are provided
if (
   process.env.PRIVATE_KEY &&
   !process.env.PRIVATE_KEY.includes("your_") &&
   process.env.PRIVATE_KEY.length >= 64
) {
   networks.shardeum = {
      url: process.env.SHARDEUM_RPC_URL || "https://api-mezame.shardeum.org",
      chainId: 8119,
      accounts: [process.env.PRIVATE_KEY],
   };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
   solidity: "0.8.0",
   paths: {
      sources: "./contracts",
   },
   networks,
};
