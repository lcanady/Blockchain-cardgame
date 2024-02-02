// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "./ExPopulusCards.sol";
import "./ExPopulusToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ExPopulusCardGameLogic is Ownable {
    event BattleStarted(
        uint256 indexed battleId,
        address indexed player,
        uint256 seq
    );
    event AbilityUsed(
        uint256 indexed battleId,
        address indexed player,
        uint256 cardId,
        uint256 seq
    );
    event AttackPerformed(
        uint256 indexed battleId,
        address indexed player,
        uint256 cardId,
        uint256 targetCardId,
        uint8 damageDealt,
        uint256 seq
    );
    event CardDied(
        uint256 indexed battleId,
        address indexed player,
        uint256 cardId,
        uint256 seq
    );
    event BattleEnded(
        uint256 indexed battleId,
        address indexed winner,
        uint256 seq
    );

    event PrizeClaimed(address indexed player, uint256 amount);

    struct BattleStatus {
        uint8 updatedPlayerHealth;
        uint8 updatedEnemyHealth;
        uint8 playerAttack;
        uint8 enemyAttack;
        uint8 playerAbility;
        uint8 enemyAbility;
        uint256[] playerCardIds;
        uint256[] enemyCardIds;
        uint256 playercardId;
        uint256 enemyCardId;
        uint256 playerFrontIndex;
        uint256 enemyFrontIndex;
        uint256 currentBattleId;
        bool playerWins;
        uint256 seq;
    }

    ExPopulusCards private cardsContract;
    ExPopulusToken private tokenContract;
    uint256 public battleCount = 0;

    mapping(address => uint256) private winStreaks;
    mapping(uint256 => BattleStatus) private battleStatuses;

    constructor(address cardsAddress) Ownable(msg.sender) {
        cardsContract = ExPopulusCards(cardsAddress);
    }

    /**
     * @dev Starts a battle between the player and a random enemy
     * @param playerCardIds Array of card IDs
     */
    function battle(
        uint256[] calldata playerCardIds
    ) external returns (uint256) {
        require(playerCardIds.length <= 3, "Can only use up to 3 cards");

        uint256 currentBattleId = battleCount++;
        uint256 seq = 0;
        BattleStatus storage status = battleStatuses[currentBattleId];

        status.playerCardIds = playerCardIds;
        status.enemyCardIds = generateEnemyDeck();
        status.currentBattleId = currentBattleId;
        status.seq = 0;

        ensureUniqueCards(playerCardIds);
        validateOwnership(playerCardIds, msg.sender);

        emit BattleStarted(currentBattleId, msg.sender, seq++);

        executeGameLoop(status);

        if (status.playerWins) {
            winStreaks[msg.sender]++;
            processPrize(msg.sender);
            emit BattleEnded(currentBattleId, msg.sender, status.seq++);
            delete battleStatuses[currentBattleId];
        } else {
            winStreaks[msg.sender] = 0;
            emit BattleEnded(currentBattleId, address(0), status.seq++);
            delete battleStatuses[currentBattleId];
        }

        return currentBattleId;
    }

    /**
     * @dev Returns the win streak of the player
     * @param player Address of the player
     * @return Win streak of the player
     */
    function getWinStreak(address player) external view returns (uint256) {
        return winStreaks[player];
    }

    /**
     * @dev Ensures that the card IDs are unique
     * @param cardIds Array of card IDs
     */
    function ensureUniqueCards(uint256[] memory cardIds) internal pure {
        for (uint i = 0; i < cardIds.length; i++) {
            for (uint j = i + 1; j < cardIds.length; j++) {
                require(
                    cardIds[i] != cardIds[j],
                    "Duplicate card IDs detected"
                );
            }
        }
    }

    /**
     * @dev Ensures that the player owns all the cards
     * @param cardIds Array of card IDs
     * @param player Address of the player
     */
    function validateOwnership(
        uint256[] memory cardIds,
        address player
    ) internal view {
        for (uint i = 0; i < cardIds.length; i++) {
            require(
                cardsContract.ownerOf(cardIds[i]) == player,
                "Player does not own this card"
            );
        }
    }

    /**
     * @dev Generates a random enemy deck
     * @return Array of card IDs
     */
    function generateEnemyDeck() internal view returns (uint256[] memory) {
        uint256 totalCards = cardsContract.totalSupply();
        require(
            totalCards >= 3,
            "Not enough cards in circulation to generate enemy deck"
        );

        uint256[] memory enemyCardIds = new uint256[](3);
        for (uint i = 0; i < enemyCardIds.length; i++) {
            uint256 randomId = (uint256(
                keccak256(abi.encodePacked(block.timestamp, i))
            ) % totalCards) + 1;
            enemyCardIds[i] = randomId;
        }

        return enemyCardIds;
    }

    /**
     * @dev Executes the game loop
     * @param status BattleStatus struct
     */
    function executeGameLoop(BattleStatus storage status) internal {
        // Fetch data for the initial front cards
        fetchCardData(status, true); // true for playerCard
        fetchCardData(status, false); // false for enemyCard

        while (
            status.playerFrontIndex < status.playerCardIds.length &&
            status.enemyFrontIndex < status.enemyCardIds.length
        ) {
            // Initialize data for the current front cards
            status.playercardId = status.playerCardIds[status.playerFrontIndex];
            status.enemyCardId = status.enemyCardIds[status.enemyFrontIndex];
            // Process abilities, attacks, and deaths

            processAbilities(status);
            processAttacks(status);
            processDeaths(status);

            // Check for draw, loss, or win conditions
            if (checkBattleOutcome(status)) {
                break;
            }
        }
    }

    /**
     * @dev Fetches card data from the cards contract
     * @param status BattleStatus struct
     * @param isPlayerCard Boolean indicating whether the card is the player's
     */
    function fetchCardData(
        BattleStatus storage status,
        bool isPlayerCard
    ) internal {
        if (isPlayerCard) {
            // Fetch data for the player's current front card
            (
                ,
                uint8 playerAttack,
                uint8 playerHealth,
                uint8 playerAbility
            ) = cardsContract.nftData(status.playercardId);
            if (status.updatedPlayerHealth == 0) {
                // Only update health if it's a new card
                status.updatedPlayerHealth = playerHealth;
            }
            status.playerAttack = playerAttack;
            status.playerAbility = playerAbility;
        } else {
            // Fetch data for the enemy's current front card
            (
                ,
                uint8 enemyAttack,
                uint8 enemyHealth,
                uint8 enemyAbility
            ) = cardsContract.nftData(status.enemyCardId);
            if (status.updatedEnemyHealth == 0) {
                // Only update health if it's a new card
                status.updatedEnemyHealth = enemyHealth;
            }
            status.enemyAttack = enemyAttack;
            status.enemyAbility = enemyAbility;
        }
    }

    /**
     * @dev Checks for draw, loss, or win conditions
     * @param status BattleStatus struct
     * @return Boolean indicating whether the battle has ended
     */
    function checkBattleOutcome(
        BattleStatus storage status
    ) internal returns (bool) {
        // Draw condition: Both cards die and no more cards left

        if (
            status.updatedPlayerHealth == 0 &&
            status.updatedEnemyHealth == 0 &&
            status.playerFrontIndex == status.playerCardIds.length &&
            status.enemyFrontIndex == status.enemyCardIds.length
        ) {
            status.playerWins = false;
            return true; // Battle ended
        }

        // Loss condition: Player has no more cards
        if (status.playerFrontIndex == status.playerCardIds.length - 1) {
            status.playerWins = false;

            return true; // Battle ended
        }

        // Win condition: Enemy has no more cards

        if (status.enemyFrontIndex == status.enemyCardIds.length - 1) {
            status.playerWins = true;

            return true; // Battle ended
        }

        return false; // Battle continues
    }

    /**
     * @dev Processes abilities
     * @param status BattleStatus struct
     */
    function processAbilities(BattleStatus storage status) internal {
        emit AbilityUsed(
            status.currentBattleId,
            msg.sender,
            status.playerCardIds[status.playerFrontIndex],
            status.seq++
        );
        emit AbilityUsed(
            status.currentBattleId,
            address(0),
            status.enemyCardIds[status.enemyFrontIndex],
            status.seq++
        );
    }

    /**
     * @dev Processes attacks
     * @param status BattleStatus struct
     */
    function processAttacks(BattleStatus storage status) internal {
        // Calculate the damage dealt and update health

        // Player's attack on the enemy card
        uint8 damageDealtToEnemy = status.playerAttack;
        if (damageDealtToEnemy > status.updatedEnemyHealth) {
            damageDealtToEnemy = status.updatedEnemyHealth;
        }
        status.updatedEnemyHealth -= damageDealtToEnemy; // Reduce enemy health by the damage dealt

        // Enemy's attack on the player card
        uint8 damageDealtToPlayer = status.enemyAttack;
        if (damageDealtToPlayer > status.updatedPlayerHealth) {
            damageDealtToPlayer = status.updatedPlayerHealth;
        }
        status.updatedPlayerHealth -= damageDealtToPlayer; // Reduce player health by the damage dealt

        // Emit AttackPerformed events
        emit AttackPerformed(
            status.currentBattleId,
            msg.sender,
            status.playercardId,
            status.enemyCardId,
            damageDealtToEnemy,
            status.seq++
        );
        emit AttackPerformed(
            status.currentBattleId,
            address(0),
            status.enemyCardId,
            status.playercardId,
            damageDealtToPlayer,
            status.seq++
        );
    }

    /**
     * @dev Processes deaths
     * @param status BattleStatus struct
     */
    function processDeaths(BattleStatus storage status) internal {
        // Check if player's card died
        if (status.updatedPlayerHealth == 0) {
            emit CardDied(
                status.currentBattleId,
                msg.sender,
                status.playercardId,
                status.seq++
            );

            // Move to the next card in the player's deck if available
            if (status.playerFrontIndex < status.playerCardIds.length - 1) {
                status.playerFrontIndex++;
                status.playercardId = status.playerCardIds[
                    status.playerFrontIndex
                ];
                fetchCardData(status, true);
            } else {
                // All player cards are dead, set playerWins to false
                status.playerWins = false;
            }
        }

        // Check if enemy's card died
        if (status.updatedEnemyHealth == 0) {
            emit CardDied(
                status.currentBattleId,
                address(0),
                status.enemyCardId,
                status.seq++
            );

            // Move to the next card in the enemy's deck if available
            if (status.enemyFrontIndex < status.enemyCardIds.length - 1) {
                status.enemyFrontIndex++;
                status.enemyCardId = status.enemyCardIds[
                    status.enemyFrontIndex
                ];
                fetchCardData(status, false);
            } else {
                // All enemy cards are dead, set playerWins to true
                status.playerWins = true;
            }
        }

        // Check if there are more cards to fight with
        if (
            status.playerFrontIndex < status.playerCardIds.length &&
            status.enemyFrontIndex < status.enemyCardIds.length
        ) {
            // Update the playercardId and enemyCardId for the next front cards
            status.playercardId = status.playerCardIds[status.playerFrontIndex];
            status.enemyCardId = status.enemyCardIds[status.enemyFrontIndex];
        }
    }

    function processPrize(address player) internal {
        uint256 streak = winStreaks[player];
        // if the win is a multiple of 5, 1000 tokens, else 100 tokens
        uint256 prize = streak % 5 == 0 ? 1000 : 100;
        tokenContract.mintToken(player, prize);
        emit PrizeClaimed(player, prize);
    }

    /**
     * @dev Sets the token contract address
     * @param tokenAddress Address of the token contract
     */
    function setTokenAddress(address tokenAddress) external onlyOwner {
        tokenContract = ExPopulusToken(tokenAddress);
    }

    /**
     * @dev Sets the cards contract address
     * @param cardsAddress Address of the cards contract
     */
    function setCardsAddress(address cardsAddress) external onlyOwner {
        cardsContract = ExPopulusCards(cardsAddress);
    }
}
