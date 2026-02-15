import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './App.css'
import RemoteVoting from './RemoteVoting.json';

const CONTRACT_ADDRESS = "0x712538e4C48303De0a9A17Bea53e8580D373Cccd";
const CONTRACT_ABI = RemoteVoting.abi;

const SHARDEUM_CHAIN = {
   chainId: '0x1FB7', // 8119 in hex
   chainName: 'Shardeum EVM Testnet',
   rpcUrls: ['https://api-mezame.shardeum.org'],
   blockExplorerUrls: ['https://explorer-mezame.shardeum.org'],
   nativeCurrency: { name: 'SHM', symbol: 'SHM', decimals: 18 },
};

const PARTIES = {
   "Bharatiya Janata Party (BJP)": { symbol: "🪷", color: "#FF6B00" },
   "Indian National Congress (INC)": { symbol: "✋", color: "#00BFFF" },
   "Aam Aadmi Party (AAP)": { symbol: "🧹", color: "#0047AB" },
   "Dravida Munnetra Kazhagam (DMK)": { symbol: "☀️", color: "#E60000" },
   "Nota (None of the Above)": { symbol: "✖️", color: "#6B7280" },
};

function getParty(name) {
   return PARTIES[name] || { symbol: "🏛️", color: "#6366f1" };
}

function App() {
   const [account, setAccount] = useState("");
   const [candidates, setCandidates] = useState([]);
   const [contract, setContract] = useState(null);
   const [hasVoted, setHasVoted] = useState(false);
   const [loading, setLoading] = useState(false);
   const [txStatus, setTxStatus] = useState("");
   const [wrongNetwork, setWrongNetwork] = useState(false);

   // Switch to Shardeum network
   const switchToShardeum = async () => {
      try {
         await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SHARDEUM_CHAIN.chainId }],
         });
         setWrongNetwork(false);
         return true;
      } catch (err) {
         if (err.code === 4902) {
            try {
               await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [SHARDEUM_CHAIN],
               });
               setWrongNetwork(false);
               return true;
            } catch (addErr) {
               console.error("Failed to add Shardeum network:", addErr);
               return false;
            }
         }
         console.error("Failed to switch network:", err);
         return false;
      }
   };

   // Connect wallet
   const connectWallet = async () => {
      if (!window.ethereum) {
         alert("Please install MetaMask to use this voting system!");
         return;
      }

      try {
         setLoading(true);
         const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

         // Check network
         const chainId = await window.ethereum.request({ method: 'eth_chainId' });
         if (chainId !== SHARDEUM_CHAIN.chainId) {
            const switched = await switchToShardeum();
            if (!switched) {
               setWrongNetwork(true);
               setLoading(false);
               return;
            }
         }

         setAccount(accounts[0]);
         await initContract(accounts[0]);
         setLoading(false);
      } catch (err) {
         console.error(err);
         setLoading(false);
      }
   };

   // Initialize contract
   const initContract = async (userAccount) => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const votingContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(votingContract);

      // Fetch data
      const list = await votingContract.getAllCandidates();
      const formatted = list.map(c => ({
         id: c.id.toNumber(),
         name: c.name,
         voteCount: c.voteCount.toNumber()
      }));
      setCandidates(formatted);

      const voted = await votingContract.voters(userAccount);
      setHasVoted(voted);

      // Listen for votes
      votingContract.on("VotedEvent", async () => {
         const updated = await votingContract.getAllCandidates();
         setCandidates(updated.map(c => ({
            id: c.id.toNumber(),
            name: c.name,
            voteCount: c.voteCount.toNumber()
         })));
         const v = await votingContract.voters(userAccount);
         setHasVoted(v);
      });
   };

   // Cast vote
   const castVote = async (id) => {
      if (!contract || hasVoted) return;
      try {
         setTxStatus("confirm");
         const tx = await contract.vote(id);
         setTxStatus("mining");
         await tx.wait();
         setTxStatus("success");
         setTimeout(() => setTxStatus(""), 4000);
      } catch (err) {
         console.error(err);
         if (err.message?.includes("already voted")) {
            setHasVoted(true);
            setTxStatus("");
         } else {
            setTxStatus("error");
            setTimeout(() => setTxStatus(""), 4000);
         }
      }
   };

   // Listen for account/chain changes
   useEffect(() => {
      if (window.ethereum) {
         window.ethereum.on('accountsChanged', () => window.location.reload());
         window.ethereum.on('chainChanged', () => window.location.reload());
      }
      return () => {
         if (contract) contract.removeAllListeners();
      };
   }, [contract]);

   const totalVotes = candidates.reduce((s, c) => s + c.voteCount, 0);
   const maxVotes = Math.max(...candidates.map(c => c.voteCount), 1);

   // ── RENDER ──

   // Not connected — show connect wallet screen
   if (!account) {
      return (
         <div className="app">
            <div className="bg-shapes">
               <div className="shape s1"></div>
               <div className="shape s2"></div>
            </div>
            <div className="connect-screen">
               <div className="logo">🗳️</div>
               <h1>RemoteChain</h1>
               <p className="tagline">Blockchain-Powered Election System</p>
               <p className="network-badge">⛓️ Shardeum Testnet</p>

               <button className="connect-btn" onClick={connectWallet} disabled={loading}>
                  {loading ? "Connecting..." : "🔐 Connect Wallet to Vote"}
               </button>

               {wrongNetwork && (
                  <div className="alert error">
                     Wrong network! Click connect again to switch to Shardeum automatically.
                  </div>
               )}

               <div className="features-row">
                  <div className="feat"><span>🔒</span>Tamper-Proof</div>
                  <div className="feat"><span>👁️</span>Transparent</div>
                  <div className="feat"><span>🌍</span>Vote Remotely</div>
                  <div className="feat"><span>🚫</span>No Data Stored</div>
               </div>
            </div>
         </div>
      );
   }

   // Connected — show ballot
   return (
      <div className="app">
         <div className="bg-shapes">
            <div className="shape s1"></div>
            <div className="shape s2"></div>
         </div>

         <header className="top-bar">
            <div className="top-left">
               <span className="brand">🗳️ RemoteChain</span>
               <span className="net-chip">Shardeum Testnet</span>
            </div>
            <div className="wallet-chip">
               <span className="dot"></span>
               {account.slice(0, 6)}...{account.slice(-4)}
            </div>
         </header>

         <main className="ballot-container">
            <h2>Cast Your Vote</h2>
            <p className="ballot-sub">Select one party. Your vote will be permanently recorded on the Shardeum blockchain.</p>

            {/* Transaction Status */}
            {txStatus === "confirm" && <div className="alert info">Please confirm the transaction in MetaMask...</div>}
            {txStatus === "mining" && <div className="alert info">⏳ Mining transaction on Shardeum... Please wait.</div>}
            {txStatus === "success" && <div className="alert success">✅ Your vote has been recorded on-chain!</div>}
            {txStatus === "error" && <div className="alert error">❌ Transaction failed. Please try again.</div>}

            {hasVoted && (
               <div className="alert success voted-msg">
                  ✅ <strong>Thank you for voting!</strong> Your vote is permanently recorded on Shardeum blockchain.
               </div>
            )}

            {/* Candidate Cards */}
            <div className="cards">
               {candidates.map(c => {
                  const p = getParty(c.name);
                  const pct = totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : 0;
                  return (
                     <div key={c.id} className={`card ${hasVoted ? 'done' : ''}`} style={{ borderLeftColor: p.color }}>
                        <div className="card-icon" style={{ background: p.color + '18', color: p.color }}>
                           {p.symbol}
                        </div>
                        <div className="card-body">
                           <h3>{c.name}</h3>
                           <div className="bar-wrap">
                              <div className="bar" style={{ width: `${(c.voteCount / maxVotes) * 100}%`, background: p.color }}></div>
                           </div>
                           <div className="card-stats">
                              <span>{c.voteCount} votes</span>
                              {totalVotes > 0 && <span className="pct">{pct}%</span>}
                           </div>
                        </div>
                        <button
                           className="vote-btn"
                           onClick={() => castVote(c.id)}
                           disabled={hasVoted || loading || txStatus !== ""}
                           style={{ borderColor: hasVoted ? '#475569' : p.color, color: hasVoted ? '#475569' : p.color }}
                        >
                           {hasVoted ? "Voted" : "Vote"}
                        </button>
                     </div>
                  );
               })}
            </div>

            <div className="total-row">
               Total votes cast: <strong>{totalVotes}</strong>
            </div>
         </main>

         <footer className="bottom-bar">
            Votes stored on <a href={`https://explorer-mezame.shardeum.org/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">Shardeum Blockchain</a> • Immutable & Publicly Verifiable
         </footer>
      </div>
   );
}

export default App;
