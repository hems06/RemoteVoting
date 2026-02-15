const ethers = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
   const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
   const signer = provider.getSigner(0);

   const artifactPath = path.join(__dirname, "../artifacts/contracts/RemoteVoting.sol/RemoteVoting.json");
   const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

   const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
   const contract = await factory.deploy();

   await contract.deployed();

   console.log("RemoteVoting deployed to:", contract.address);
}

main().catch((error) => {
   console.error(error);
   process.exitCode = 1;
});
