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

    const printCards = async ({ address, health, attack, ability }) => {
      for (let i = 0; i < 3; i++) {
        // create a new card
        await this.contracts.Cards.connect(this.signers.creator)
          .mintCard(
            address,
            health,
            attack,
            ability,
          );
      }
    };

    this.printCards = printCards;
  });

  describe("User Story #1 (Minting)", async function () {
    it("Should be able to mint a card with the correct ID", async function () {
      const res = await this.contracts.Cards.connect(
        this.signers.creator,
      ).mintCard(this.signers.testAccount2.address, 10, 10, 1);

      expect(
        await this.contracts.Cards.connect(this.signers.creator)
          .ownerOf(0),
      ).to.equal(this.signers.testAccount2.address);
    });

    it("Can mint a card to a specific player & verify ownership afterwards", async function () {
      const res = await this.contracts.Cards.connect(
        this.signers.creator,
      ).mintCard(this.signers.testAccount2.address, 10, 10, 1);
      expect(
        await this.contracts.Cards.connect(this.signers.creator)
          .ownerOf(1),
      ).to.equal(this.signers.testAccount2.address);

      const card = await this.contracts.Cards.connect(
        this.signers.creator,
      ).nftData(1);
      expect(card.owner).to.equal(this.signers.testAccount2.address);
    });

    it("Can call a lookup function to find the minted card details by passing in an id.", async function () {
      const res = await this.contracts.Cards.connect(
        this.signers.creator,
      ).mintCard(this.signers.testAccount2.address, 10, 10, 1);
      const card = await this.contracts.Cards.connect(
        this.signers.creator,
      ).nftData(2);
      expect(card.health).to.equal(10);
    });

    it("Mint function should only be callable by the address that deployed the contract in the first place, or specific addresses approved by the original deployer", async function () {
      await this.contracts.Cards.connect(this.signers.creator)
        .grantRole(
          await this.contracts.Cards.MINTING_ROLE(),
          this.signers.testAccount2.address,
        );

      await this.contracts.Cards.connect(this.signers.testAccount2)
        .mintCard(this.signers.testAccount3.address, 1, 2, 1);
      const card = await this.contracts.Cards.nftData(3);
      expect(card.owner).to.equal(this.signers.testAccount3.address);
    });

    it("should be required to specify the health, attack, and ability for the card in question. The ability value should be limited only to 0, 1, or 2", async function () {
      await expect(
        this.contracts.Cards.connect(this.signers.creator).mintCard(
          this.signers.testAccount3.address,
          1,
          2,
          4,
        ),
      ).to.be.rejectedWith("Ability must be between 0 and 2");
    });
  });

  describe("User Story #2 (Ability Configuration)", async function () {
    it("can define the 'priority' for a specific ability.", async function () {
      await this.contracts.Cards.connect(this.signers.creator)
        .setAbilityPriority(1, 1);
      const ability = await this.contracts.Cards.connect(
        this.signers.creator,
      ).abilityPriority(1);
      expect(ability.priority).to.equal(1);
    });
    it("can call the function to update the priority for an ability multiple times.", async function () {
      await this.contracts.Cards.connect(this.signers.creator)
        .setAbilityPriority(1, 1);
      await this.contracts.Cards.connect(this.signers.creator)
        .setAbilityPriority(1, 2);
      const ability = await this.contracts.Cards.connect(
        this.signers.creator,
      ).abilityPriority(1);
      expect(ability.priority).to.equal(2);
    });
    it("cannot set multiple abilities to have the same priority.", async function () {
      await this.contracts.Cards.connect(this.signers.creator)
        .setAbilityPriority(1, 1);
      await expect(
        this.contracts.Cards.connect(this.signers.creator)
          .setAbilityPriority(2, 1),
      ).to.be.rejectedWith("Ability priority already set");
    });

    it("can call a function to retrieve the priority of a specific ability.", async function () {
      await this.contracts.Cards.connect(this.signers.creator)
        .setAbilityPriority(1, 1);
      const ability = await this.contracts.Cards.connect(
        this.signers.creator,
      ).abilityPriority(1);
      expect(ability.priority).to.equal(1);
    });

    it("Should error if the ability ID does not exist", async function () {
      await expect(
        this.contracts.Cards.connect(this.signers.creator)
          .setAbilityPriority(10, 1),
      ).to.be.rejectedWith("Ability must be between 0 and 3");
    });
  });

  describe("User Story #3 (Battles & Game Loop)", async function () {
    before(async function () {
      // Set ability priorities as per the Director's information
      await this.contracts.Cards.connect(this.signers.creator)
        .setAbilityPriority(0, 3); // Shield
      await this.contracts.Cards.connect(this.signers.creator)
        .setAbilityPriority(1, 1); // Roulette
      await this.contracts.Cards.connect(this.signers.creator)
        .setAbilityPriority(2, 2); // Freeze
    });

    it("Player can initiate a battle with up to 3 NFTs", async function () {
      const playerCardIds = [0, 1, 2];
      const res = await this.contracts.CardGameLogic.connect(
        this.signers.testAccount2,
      ).battle(playerCardIds);
      expect(res).to.exist;
    });

    it("Should error if a submitted NFT ID is not owned by the player", async function () {
      this.printCards({
        address: this.signers.testAccount3.address,
        health: 1,
        attack: 1,
        ability: 1,
      });
      const playerCardIds = [0, 1, 3]; // Assume NFT ID 100 is not owned by testAccount2
      await expect(
        this.contracts.CardGameLogic.connect(this.signers.testAccount2)
          .battle(playerCardIds),
      ).to.be.rejectedWith("Player does not own this card");
    });

    it("An enemy deck of 3 cards is generated and battle outcomes are determined", async function () {
      const playerCardIds = [0, 1, 2]; // Example card IDs owned by testAccount2
      const res = await this.contracts.CardGameLogic.connect(
        this.signers.testAccount2,
      ).battle(playerCardIds);

      // Check for BattleEnded event
      const receipt = await res.wait();
      const battleEndedEvent = receipt.events.find((e) =>
        e.event === "BattleEnded"
      );
      expect(battleEndedEvent).to.exist;
    });
  });
  describe("User Story #4 (Fungible Token & Battle Rewards)", async function () {
    it("Should only allow the owner or the CardGameLogic contract to call mintToken", async function () {
      // Attempt to mint from a non-owner address
      await expect(
        this.contracts.Token.connect(this.signers.testAccount2)
          .mintToken(this.signers.testAccount2.address, 100),
      ).to.be.revertedWith("Caller is not authorized");

      // Mint from the owner address
      await expect(
        this.contracts.Token.mintToken(
          this.signers.testAccount2.address,
          100,
        ),
      ).to.not.be.reverted;
    });

    it("Should be able to mint  tokens to the winner of a battle", async function () {
      // give previous tokens to testAccount3
      const wallet2Balance = await this.contracts.Token.balanceOf(
        this.signers.testAccount2.address,
      );
      await this.contracts.Token.connect(this.signers.testAccount2)
        .transfer(this.signers.testAccount3.address, wallet2Balance);

      // while winningStreak is less than 1 then keep battling
      let check = false;
      while (!check) {
        await this.contracts.CardGameLogic.connect(
          this.signers.testAccount2,
        ).battle([0, 1, 2]);

        if (
          (await this.contracts.CardGameLogic.getWinStreak(
            this.signers.testAccount2.address,
          )).toNumber() > 0 
        ) {
          check = true;
        }
      }

      // get wallet2 balance
      const wallet2Balance2 = await this.contracts.Token.balanceOf(
        this.signers.testAccount2.address,
      );

      // Check that the balance has increased by 100
      expect(wallet2Balance2.toNumber()).to.be.greaterThanOrEqual(100);
    });
    it("Should correctly simulate a battle flow and reward tokens after a win", async function () {
      const playerCardIds = [0, 1, 2];

      // get wallet2 balance
      const wallet2Balance = await this.contracts.Token.balanceOf(
        this.signers.testAccount2.address,
      );

      // send any tokrns yo testAccount3 from testAccount2
      await this.contracts.Token.connect(this.signers.testAccount2)
        .transfer(this.signers.testAccount3.address, wallet2Balance);

      let ex = false;
      let events = [];
      let receipt;
      // while account2 isn't the winner...
      while (!ex) {
        // Start the battle
        const tx = await this.contracts.CardGameLogic.connect(
          this.signers.testAccount2,
        ).battle(playerCardIds);
        receipt = await tx.wait();

        // Listen for events (if applicable)
        events = receipt.events.reduce((acc, event) => {
          acc.push(event);
          return acc;
        }, []);

        // get the battleId from the most recent BattleStarted event.  You'll need to sort them by timestamp to find it.

        if (receipt.events.find((e) => e.event === "BattleEnded")) {
          // if the winner is acct2 then break
          if (
            receipt.events.find((e) => e.event === "BattleEnded").args
              .winner ===
              this.signers.testAccount2.address
          ) {
            ex = true;
          }
        }
      }

      const battleId = receipt.events
        .filter((e) => e.event === "BattleStarted")
        .sort((a, b) =>
          a.args.timestamp.toNumber() - b.args.timestamp.toNumber()
        )[0].args.battleId;

      // Check that some events were emitted with the battleID
      events = events.filter((e) => {
        return e.args?.battleId?.toString() === battleId.toString();
      });

      expect(events.length).to.be.greaterThan(0);
    });
    it("should give 1000 coins for wins at multiple of 5", async function () {
      const playerCardIds = [0, 1, 2];

      while (
        (await this.contracts.CardGameLogic.getWinStreak(
          this.signers.testAccount2.address,
        )).toNumber() > 5
      ) {
        for (let i = 0; i < 8; i++) {
          await this.contracts.CardGameLogic.connect(
            this.signers.testAccount2,
          ).battle(playerCardIds);
        }

        const balance = await this.contracts.Token.balanceOf(
          this.signers.testAccount2.address,
        );
        expect(balance.toNumber()).to.be.greaterThanOrEqual(1000);
      }
    });
  });
  describe("User Story #5 (Battle Logs & Historical Lookup)", async function () {
    it("Should be able to retrieve a list of battles that a player has participated in", async function () {
      // Player's address for which we want to retrieve battle history
      const playerAddress = this.signers.testAccount2.address;

      // Fetch the filter for BattleStarted and BattleEnded events involving the player
      const battleStartedFilter = this.contracts.CardGameLogic
        .filters.BattleStarted(null, playerAddress, null);
      const battleEndedFilter = this.contracts.CardGameLogic.filters
        .BattleEnded(null, playerAddress, null);

      // Get the logs from the blockchain
      const battleStartedLogs = await hre.ethers.provider.getLogs(
        battleStartedFilter,
      );
      const battleEndedLogs = await hre.ethers.provider.getLogs(
        battleEndedFilter,
      );

      // Parse the logs to get the event arguments
      const battleStartedEvents = battleStartedLogs.map((log) =>
        this.contracts.CardGameLogic.interface.parseLog(log)
      );

      const battleId = battleStartedEvents[0].args.battleId;

      const battleEndedEvents = battleEndedLogs.map((log) =>
        this.contracts.CardGameLogic.interface.parseLog(log)
      );

      const participatedBattleIds = battleStartedEvents.map((event) =>
        event.args.battleId
      );

      expect(participatedBattleIds).to.include(battleId);
    });
  });
});
