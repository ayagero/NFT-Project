// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CreatorToken is ERC20 {
    constructor() ERC20("CreatorToken", "CTOK") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ArtNFT is ERC721URIStorage {
    uint256 private _tokenIds;

    constructor() ERC721("ArtNFT", "ANFT") {
        _tokenIds = 0;
    }

    function mint(address to, string memory tokenURI) external returns (uint256) {
        _tokenIds += 1;
        uint256 newTokenId = _tokenIds;
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        return newTokenId;
    }

    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIds;
    }
}

contract NFTProject is Ownable {
    CreatorToken public token;
    ArtNFT public nft;
    uint256 public constant REWARD_AMOUNT = 100 * 10**18; // 100 tokens per NFT mint
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18; // 1M tokens max supply

    event NFTRewarded(address indexed creator, uint256 tokenId, uint256 rewardAmount);

    constructor(address _tokenAddress, address _nftAddress) Ownable(msg.sender) {
        token = CreatorToken(_tokenAddress);
        nft = ArtNFT(_nftAddress);
    }

    function mintNFT(string memory tokenURI) external returns (uint256) {
        require(token.totalSupply() + REWARD_AMOUNT <= MAX_SUPPLY, "Max token supply reached");

        uint256 newTokenId = nft.mint(msg.sender, tokenURI);
        token.mint(msg.sender, REWARD_AMOUNT);

        emit NFTRewarded(msg.sender, newTokenId, REWARD_AMOUNT);
        return newTokenId;
    }
}