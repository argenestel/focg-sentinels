// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CardBattle is Ownable, ERC721 {
    using Strings for uint256;

    // ------------------------- structs -------------------------
    struct Card {
        uint256 id;
        uint256 attack;
        uint256 defense;
        uint256 speed;
    }

    struct Player {
        address addr;
        uint256 selectedCardIndex;
        bytes32 commitment;
    }

    struct Battle {
        Player player1;
        Player player2;
        Stage stage;
        uint256 deadline;
    }

    address ownerAddress;

    // ------------------------- enums -------------------------
    enum Stage { None, Matching, Commit, Reveal }

    // ------------------------- state variables -------------------------
    uint256 public stageSpan;
    uint256 public maxBattles;
    uint256 public currentBattleId;
    mapping(address => Card[3]) public playerCards;
    mapping(uint256 => Battle) public battles;
    mapping(uint256 => uint256[]) public battleResults;

    // ------------------------- events -------------------------
    event CardsMinted(address player);
    event BattleCreated(uint256 battleId, address player1, address player2);
    event BattleResult(uint256 battleId, address winner, address loser);
    event Tie();
    // ------------------------- constructor -------------------------
    constructor()  ERC721("CardBattle", "CBT") Ownable(msg.sender){
        stageSpan = 1 hours;
        maxBattles = 3;
    }

    // ------------------------- external functions -------------------------
    function enterGame() external {
        require(playerCards[msg.sender][0].id == 0, "Already entered");
        _generateCards(msg.sender);
        emit CardsMinted(msg.sender);
    }

    function exitGame() external {
        require(playerCards[msg.sender][0].id !=0, "Not entered Yet");
            for (uint i = 0; i < 3; i++) {
            uint256 id = 0;
            uint256 attack =0;
            uint256 defense = 0;
            uint256 speed =0;
            
            playerCards[msg.sender][i] = Card(id, attack, defense, speed);
        }
    }

    function selectCard(uint256 index) external {
        require(index < 3, "Invalid index");
        require(playerCards[msg.sender][index].id != 0, "Card not available");
        
        Battle storage battle = battles[currentBattleId];
        require(battle.stage == Stage.Matching || battle.stage == Stage.None, "Cannot select card now");
        
        if (battle.stage == Stage.None) {
            battle.player1 = Player(msg.sender, index, bytes32(0));
            battle.stage = Stage.Matching;
            battle.deadline = block.timestamp + stageSpan;
        } else {
            require(battle.player1.addr != msg.sender, "Already in battle");
            battle.player2 = Player(msg.sender, index, bytes32(0));
            battle.stage = Stage.Reveal;
            battle.deadline = block.timestamp + stageSpan;
            emit BattleCreated(currentBattleId, battle.player1.addr, battle.player2.addr);
        }
    }


    function commitMove(bytes32 commitment) external {
        Battle storage battle = battles[currentBattleId];
        require(battle.stage == Stage.Commit, "Not commit stage");
        require(block.timestamp <= battle.deadline, "Commit stage ended");
        require(msg.sender == battle.player1.addr || msg.sender == battle.player2.addr, "Not in this battle");

        if (msg.sender == battle.player1.addr) {
            battle.player1.commitment = commitment;
        } else {
            battle.player2.commitment = commitment;
        }

        if (battle.player1.commitment != bytes32(0) && battle.player2.commitment != bytes32(0)) {
            battle.stage = Stage.Reveal;
            battle.deadline = block.timestamp + stageSpan;
        }
    }

    function revealMove(uint256 randomness) external {
        Battle storage battle = battles[currentBattleId];
        require(battle.stage == Stage.Reveal, "Not reveal stage");
        require(block.timestamp <= battle.deadline, "Reveal stage ended");
        require(msg.sender == battle.player1.addr || msg.sender == battle.player2.addr, "Not in this battle");

        // bytes32 commitment = keccak256(abi.encodePacked(msg.sender, randomness));
        // if (msg.sender == battle.player1.addr) {
        //     require(commitment == battle.player1.commitment, "Invalid commitment");
        // } else {
        //     require(commitment == battle.player2.commitment, "Invalid commitment");
        // }

        _resolveBattle(randomness);
    }

    // ------------------------- internal functions -------------------------
    function _generateCards(address player) internal {
        for (uint i = 0; i < 3; i++) {
            uint256 id = uint256(keccak256(abi.encodePacked(block.timestamp, player, i)));
            uint256 attack = uint256(keccak256(abi.encodePacked(id, "attack"))) % 100 + 1;
            uint256 defense = uint256(keccak256(abi.encodePacked(id, "defense"))) % 100 + 1;
            uint256 speed = uint256(keccak256(abi.encodePacked(id, "speed"))) % 100 + 1;
            
            playerCards[player][i] = Card(id, attack, defense, speed);
            _safeMint(player, id);
        }
    }

    function _resolveBattle(uint256 randomness) internal {
        Battle storage battle = battles[currentBattleId];
        Card memory card1 = playerCards[battle.player1.addr][battle.player1.selectedCardIndex];
        Card memory card2 = playerCards[battle.player2.addr][battle.player2.selectedCardIndex];

        uint256 score1 = card1.attack + card1.defense + card1.speed;
        uint256 score2 = card2.attack + card2.defense + card2.speed;

        address winner;
        address loser;

        if (score1 > score2) {
            winner = battle.player1.addr;
            loser = battle.player2.addr;
        } else if (score2 > score1) {
            winner = battle.player2.addr;
            loser = battle.player1.addr;
        } else {
            // In case of a tie, use the randomness to decide
            // if (randomness % 2 == 0) {
            //     winner = battle.player1.addr;
            //     loser = battle.player2.addr;
            // } else {
            //     winner = battle.player2.addr;
            //     loser = battle.player1.addr;
            // }
            winner = address(0);
            loser = address(0);
            emit Tie();
        }

        battleResults[currentBattleId] = [score1, score2];
        emit BattleResult(currentBattleId, winner, loser);

        // Reset for next battle
        delete battles[currentBattleId];
        currentBattleId++;

        if (currentBattleId >= maxBattles) {
            // End game logic here
        }
    }

    // ------------------------- view functions -------------------------
    function getPlayerCards(address player) external view returns (Card[3] memory) {
        return playerCards[player];
    }

    function getCurrentBattle() external view returns (Battle memory) {
        return battles[currentBattleId];
    }

    function getBattleResult(uint256 battleId) external view returns (uint256[] memory) {
        return battleResults[battleId];
    }

    // ------------------------- owner functions -------------------------
    function setStageSpan(uint256 _stageSpan) external onlyOwner {
        stageSpan = _stageSpan;
    }

    function setMaxBattles(uint256 _maxBattles) external onlyOwner {
        maxBattles = _maxBattles;
    }
}