import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Signers } from "../types";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { deployContracts } from "../deploy_scripts/main";

describe("Unit tests", function () {
  before(async function () {
    chai.should();
    chai.use(chaiAsPromised);

    // Set up a signer for easy use
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.creator = signers[0];
    this.signers.testAccount2 = signers[1];
    this.signers.testAccount3 = signers[2];

    // Deploy the contracts
    this.contracts = await deployContracts();
  });

  describe("User Story #1 (Minting)", async function () {
    it("Should be able to mint a card with the correct ID", async function () {
      const res = await this.contracts.exPopulusCards.connect(
        this.signers.creator,
      ).mintCard(this.signers.testAccount2.address, 1, 5, 1);

      expect(
        await this.contracts.exPopulusCards.connect(this.signers.creator)
          .ownerOf(0),
      ).to.equal(this.signers.testAccount2.address);
    });

    it("Can mint a card to a specific player & verify ownership afterwards", async function () {
      const res = await this.contracts.exPopulusCards.connect(
        this.signers.creator,
      ).mintCard(this.signers.testAccount2.address, 3, 4, 1);
      expect(
        await this.contracts.exPopulusCards.connect(this.signers.creator)
          .ownerOf(1),
      ).to.equal(this.signers.testAccount2.address);

      const card = await this.contracts.exPopulusCards.connect(
        this.signers.creator,
      ).nftData(1);
      expect(card.owner).to.equal(this.signers.testAccount2.address);
    });

    it("Can call a lookup function to find the minted card details by passing in an id.", async function () {
      const res = await this.contracts.exPopulusCards.connect(
        this.signers.creator,
      ).mintCard(this.signers.testAccount2.address, 2, 4, 1);
      const card = await this.contracts.exPopulusCards.connect(
        this.signers.creator,
      ).nftData(2);
      expect(card.health).to.equal(4);
    });

    it("Mint function should only be callable by the address that deployed the contract in the first place, or specific addresses approved by the original deployer", async function () {
      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .grantRole(
          await this.contracts.exPopulusCards.MINTING_ROLE(),
          this.signers.testAccount2.address,
        );

      await this.contracts.exPopulusCards.connect(this.signers.testAccount2)
        .mintCard(this.signers.testAccount3.address, 1, 2, 1);
      const card = await this.contracts.exPopulusCards.nftData(3);
      expect(card.owner).to.equal(this.signers.testAccount3.address);
    });

    it("should be required to specify the health, attack, and ability for the card in question. The ability value should be limited only to 0, 1, or 2", async function () {
      await expect(
        this.contracts.exPopulusCards.connect(this.signers.creator).mintCard(
          this.signers.testAccount2.address,
          1,
          2,
          4,
        ),
      ).to.be.rejectedWith("Ability must be between 0 and 2");
    });
  });

  describe("User Story #2 (Ability Configuration)", async function () {
    it("can define the 'priority' for a specific ability.", async function () {
      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .setAbilityPriority(1, 1);
      const ability = await this.contracts.exPopulusCards.connect(
        this.signers.creator,
      ).abilityPriority(1);
      expect(ability.priority).to.equal(1);
    });
    it("can call the function to update the priority for an ability multiple times.", async function () {
      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .setAbilityPriority(1, 1);
      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .setAbilityPriority(1, 2);
      const ability = await this.contracts.exPopulusCards.connect(
        this.signers.creator,
      ).abilityPriority(1);
      expect(ability.priority).to.equal(2);
    });
    it(", but I cannot set multiple abilities to have the same priority.", async function () {
      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .setAbilityPriority(1, 1);
      await expect(
        this.contracts.exPopulusCards.connect(this.signers.creator)
          .setAbilityPriority(2, 1),
      ).to.be.rejectedWith("Ability priority already set");
    });
  });

  describe("User Story #3 (Battles & Game Loop)", async function () {
    before(async function () {
      // Set ability priorities as per the Director's information
      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .setAbilityPriority(0, 3); // Shield
      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .setAbilityPriority(1, 1); // Roulette
      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .setAbilityPriority(2, 2); // Freeze

      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .mintCard(
          this.signers.testAccount3.address,
          3,
          3,
          1,
        );

      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .mintCard(
          this.signers.testAccount3.address,
          1,
          2,
          1,
        );

      await this.contracts.exPopulusCards.connect(this.signers.creator)
        .mintCard(
          this.signers.testAccount3.address,
          5,
          2,
          1,
        );
    });

    it("Player can initiate a battle with up to 3 NFTs", async function () {
      // Assume cards have been minted and owned by testAccount2
      const playerCardIds = [0, 1, 2]; // Example card IDs owned by testAccount2
      const res = await this.contracts.exPopulusCardGameLogic.connect(
        this.signers.testAccount2,
      ).battle(playerCardIds);
      expect(res).to.exist;
    });

    it("Should error if a submitted NFT ID is not owned by the player", async function () {
      const playerCardIds = [0, 1, 5]; // Assume NFT ID 100 is not owned by testAccount2
      await expect(
        this.contracts.exPopulusCardGameLogic.connect(this.signers.testAccount2)
          .battle(playerCardIds),
      ).to.be.rejectedWith("Player does not own this card");
    });

    it("An enemy deck of 3 cards is generated and battle outcomes are determined", async function () {
      const playerCardIds = [0, 1, 2]; // Example card IDs owned by testAccount2
      const res = await this.contracts.exPopulusCardGameLogic.connect(
        this.signers.testAccount2,
      ).battle(playerCardIds);

      // Check if enemy deck is generated and battle outcome is determined
    });

    it("Win streak is incremented after a win, and reset after a loss", async function () {
      // Check win streak increment
      const winStreakBefore = await this.contracts.exPopulusCardGameLogic
        .getWinStreak(this.signers.testAccount2.address);
      expect(winStreakBefore).to.equal(1); // Assuming it was the first win

      // Check win streak reset
      const winStreakAfter = await this.contracts.exPopulusCardGameLogic
        .getWinStreak(this.signers.testAccount2.address);
      expect(winStreakAfter).to.equal(0);
    });
  });
  describe("User Story #4 (Fungible Token & Battle Rewards)", async function () {
    it("Should be able to mint a fungible token to the winner of a battle", async function () {
      const res = await this.contracts.exPopulusCardGameLogic.connect(
        this.signers.testAccount2,
      ).battle([0, 1, 2]);
      console.log(
        await this.contracts.exPopulusToken.balanceOf(
          this.signers.testAccount2.address,
        ),
      );

      console.log(
        await this.contracts.exPopulusCardGameLogic.getWinStreak(
          this.signers.testAccount2.address,
        ),
      );

      if (
        +(await this.contracts.exPopulusCardGameLogic.getWinStreak(
          this.signers.testAccount2.address,
        ))
      ) {
        const balance = await this.contracts.exPopulusToken.balanceOf(
          this.signers.testAccount2.address,
        );

        expect(balance.toNumber()).to.be.greaterThanOrEqual(100);
      } else {
        const balance = await this.contracts.exPopulusToken.balanceOf(
          this.signers.testAccount2.address,
        );
        expect(balance.toNumber()).to.be.lessThanOrEqual(100);
      }
    });
  });
});

describe("User Story #5 (Battle Logs & Historical Lookup)", async function () {
});
