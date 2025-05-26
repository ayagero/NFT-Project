import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';
import NFTProjectABI from './NFTProjectABI.json';
import './App.css';

const ipfs = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
const contractAddress = "0xee52C7Af59678F33670A50c6B8f0a4f319ae7Cd7";

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [nfts, setNfts] = useState([]);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [txHash, setTxHash] = useState('');

  // Connect Wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractInstance = new ethers.Contract(contractAddress, NFTProjectABI, signer);
        setContract(contractInstance);

        // Get token balance
        const tokenAddress = await contractInstance.token();
        const tokenContract = new ethers.Contract(tokenAddress, [
          "function balanceOf(address) view returns (uint256)"
        ], signer);
        const balance = await tokenContract.balanceOf(accounts[0]);
        setTokenBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error("Error connecting wallet:", error);
        alert("Failed to connect wallet.");
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // Fetch all NFTs
  const fetchNFTs = async () => {
    if (contract) {
      const nftContractAddress = await contract.nft();
      const nftContract = new ethers.Contract(nftContractAddress, [
        "function getCurrentTokenId() view returns (uint256)",
        "function tokenURI(uint256) view returns (string)",
        "function ownerOf(uint256) view returns (address)"
      ], ethers.getDefaultProvider('https://rpc.sepolia.lisk.com'));

      const totalSupply = await nftContract.getCurrentTokenId();
      const nftsArray = [];
      for (let i = 1; i <= totalSupply; i++) {
        try {
          const uri = await nftContract.tokenURI(i);
          const response = await fetch(uri);
          const metadata = await response.json();
          const owner = await nftContract.ownerOf(i);
          nftsArray.push({ id: i, metadata, owner });
        } catch (error) {
          console.error(`Error fetching NFT ${i}:`, error);
        }
      }
      setNfts(nftsArray);
    }
  };

  // Handle file upload
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Mint NFT
  const mintNFT = async () => {
    if (!file || !name || !description || !contract) {
      alert("Please fill all fields and connect wallet!");
      return;
    }

    try {
      // Upload image to IPFS
      const imageResult = await ipfs.add(file);
      const imageURI = `https://ipfs.infura.io/ipfs/${imageResult.path}`;

      // Create metadata
      const metadata = {
        name,
        description,
        image: imageURI
      };

      // Upload metadata to IPFS
      const metadataResult = await ipfs.add(Buffer.from(JSON.stringify(metadata)));
      const metadataURI = `https://ipfs.infura.io/ipfs/${metadataResult.path}`;

      // Mint NFT
      const tx = await contract.mintNFT(metadataURI);
      setTxHash(tx.hash);
      await tx.wait();

      // Refresh data
      fetchNFTs();
      const tokenAddress = await contract.token();
      const tokenContract = new ethers.Contract(tokenAddress, [
        "function balanceOf(address) view returns (uint256)"
      ], ethers.getDefaultProvider('https://rpc.sepolia.lisk.com'));
      const balance = await tokenContract.balanceOf(account);
      setTokenBalance(ethers.formatEther(balance));

      // Clear form
      setName('');
      setDescription('');
      setFile(null);
    } catch (error) {
      console.error("Error minting NFT:", error);
      alert("Failed to mint NFT. Check console for details.");
    }
  };

  // Listen for NFT mint events
  useEffect(() => {
  if (contract) {
    contract.on("NFTRewarded", () => {
      fetchNFTs();
    });

    fetchNFTs();
  }

  return () => {
    if (contract) {
      contract.removeAllListeners("NFTRewarded");
    }
  };
}, [contract, fetchNFTs]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">NFT Platform</h1>

      {/* Wallet Connection */}
      {!account ? (
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={connectWallet}
        >
          Connect Wallet
        </button>
      ) : (
        <div className="mb-4">
          <p>Connected: {account}</p>
          <p>CreatorToken Balance: {tokenBalance} CTOK</p>
        </div>
      )}

      {/* Minting Form */}
      {account && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Mint New NFT</h2>
          <input
            type="text"
            placeholder="NFT Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border p-2 mb-2 w-full"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-2 mb-2 w-full"
          />
          <input
            type="file"
            onChange={handleFileChange}
            className="mb-2"
          />
          <button
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={mintNFT}
          >
            Mint NFT
          </button>
          {txHash && (
            <p className="mt-2">Transaction Hash: 
              <a 
                href={`https://sepolia.lisk.com/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500"
              >
                {txHash}
              </a>
            </p>
          )}
        </div>
      )}

      {/* NFT Gallery */}
      <h2 className="text-2xl font-bold mb-2">NFT Gallery</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {nfts.map((nft) => (
          <div key={nft.id} className="border p-4 rounded">
            <img src={nft.metadata.image} alt={nft.metadata.name} className="w-full h-48 object-cover mb-2" />
            <h3 className="text-xl font-bold">{nft.metadata.name}</h3>
            <p>{nft.metadata.description}</p>
            <p>Creator: {nft.owner}</p>
            <p>Token ID: {nft.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;