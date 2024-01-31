// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";

contract ExPopulusCards is
    ERC721,
    AccessControl,
    ERC721Enumerable,
    ERC721Royalty
{
    using Strings for uint256;

    event CardMinted(
        address indexed _to,
        uint256 indexed _tokenId,
        uint8 _attack,
        uint8 _health,
        uint8 _ability
    );

    event AbilityPrioritySet(
        uint8 indexed _abilityId,
        uint8 _priority,
        address indexed _setter
    );

    struct PriorityData {
        uint8 priority;
        bool isSet;
    }

    struct NftData {
        address owner;
        uint8 attack;
        uint8 health;
        uint8 ability;
    }

    mapping(uint256 => NftData) public nftData;
    mapping(uint8 => PriorityData) public abilityPriority; // Maps ability ID to its priority
    mapping(uint8 => PriorityData) private priorityToAbility; // Maps priority to ability ID for reverse lookup

    string private _baseTokenURI;
    bytes32 public constant MINTING_ROLE = keccak256("MINTING_ROLE");

    constructor() ERC721("ExPopulusCards", "EPC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTING_ROLE, msg.sender);
        _baseTokenURI = "https://example.com/";

        _setDefaultRoyalty(msg.sender, 1000);
    }

    /**
     * @dev Sets the base URI for all token IDs.
     * @param baseURI string representing the base URI for all token IDs.
     */
    function setBaseURI(
        string memory baseURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Mints a new card with the given stats and ability.
     * @param _to address of the future owner of the token
     * @param _attack attack value of the card
     * @param _health health value of the card
     * @param _ability ability of the card
     */
    function mintCard(
        address _to,
        uint8 _attack,
        uint8 _health,
        uint8 _ability
    ) external onlyRole(MINTING_ROLE) {
        require(
            _ability >= 0 && _ability < 3,
            "Ability must be between 0 and 2"
        );

        require(_attack > 0, "Attack must be greater than 0");
        require(_health > 0, "Health must be greater than 0");

        uint256 tokenId = totalSupply();
        _safeMint(_to, tokenId);
        nftData[tokenId] = NftData(_to, _attack, _health, _ability);
        emit CardMinted(_to, tokenId, _attack, _health, _ability);
    }

    /**
     * @dev Returns the priority of an ability.
     * @param abilityId ID of the ability
     */
    function getAbilityPriority(uint8 abilityId) external view returns (uint8) {
        PriorityData memory data = abilityPriority[abilityId];
        require(data.isSet, "Priority not set");
        return data.priority;
    }

    /**
     * @dev Returns the ability of a priority.
     * @param priority priority of the ability
     */
    function getAbilityByPriority(
        uint8 priority
    ) external view returns (uint8) {
        PriorityData memory data = priorityToAbility[priority];
        require(data.isSet, "Ability not set");
        return data.priority;
    }

    /**
     * @dev Sets the priority of an ability.
     * @param abilityId ID of the ability
     * @param priority priority of the ability
     */
    function setAbilityPriority(
        uint8 abilityId,
        uint8 priority
    ) external onlyRole(MINTING_ROLE) {
        require(
            abilityId >= 0 && abilityId < 4,
            "Ability must be between 0 and 3"
        );
        require(priority >= 0, "Priority must be greater than or equal to 0");

        PriorityData memory currentPriorityDataForAbility = abilityPriority[
            abilityId
        ];
        PriorityData memory currentAbilityDataForPriority = priorityToAbility[
            priority
        ];

        require(
            !currentAbilityDataForPriority.isSet ||
                currentAbilityDataForPriority.priority == abilityId,
            "Ability priority already set"
        );

        if (
            !currentPriorityDataForAbility.isSet ||
            currentPriorityDataForAbility.priority != priority
        ) {
            if (currentPriorityDataForAbility.isSet) {
                delete priorityToAbility[
                    currentPriorityDataForAbility.priority
                ];
            }

            if (
                currentAbilityDataForPriority.isSet &&
                currentAbilityDataForPriority.priority != abilityId
            ) {
                delete abilityPriority[currentAbilityDataForPriority.priority];
            }

            abilityPriority[abilityId] = PriorityData({
                priority: priority,
                isSet: true
            });
            priorityToAbility[priority] = PriorityData({
                priority: abilityId,
                isSet: true
            });
        }

        emit AbilityPrioritySet(abilityId, priority, msg.sender);
    }

    /**
     * @dev Updatea the owner of a token.
     * @param to address of the new owner of the token
     * @param tokenId uint256 ID of the token to update
     * @param auth address of the caller
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        virtual
        override(ERC721, ERC721Enumerable)
        returns (address updatedAddress)
    {
        nftData[tokenId].owner = to;
        updatedAddress = super._update(to, tokenId, auth);
    }

    /**
     * @dev returns the supported interfaces of the contract
     * @param interfaceId interface ID to check
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721, ERC721Enumerable, AccessControl, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev increases the balance of an account
     * @param account address of the account
     * @param value amount to increase the balance by
     */
    function _increaseBalance(
        address account,
        uint128 value
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}
