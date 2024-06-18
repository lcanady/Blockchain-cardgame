# Card Game Smart Contract

This repository contains the smart contracts for a blockchain-based card game. The game involves players battling with cards that have various attributes and abilities. The contracts are written in Solidity and tested using Hardhat.

## Contracts

### [CardGameLogic.sol](file:///Users/lcanady/github/Blockchain-cardgame/contracts/contracts/CardGameLogic.sol#1%2C1-1%2C1)

This contract handles the core game logic, including battles, abilities, attacks, and rewards.

#### Key Functions

- `battle(uint256[] calldata playerCardIds)`: Starts a battle between the player and a random enemy.
- `fetchCardData(BattleStatus storage status, bool isPlayerCard)`: Fetches card data from the cards contract.
- `checkBattleOutcome(BattleStatus storage status)`: Checks for draw, loss, or win conditions.
- `processAbilities(BattleStatus storage status)`: Processes abilities during the battle.
- `processAttacks(BattleStatus storage status)`: Processes attacks during the battle.
- `processDeaths(BattleStatus storage status)`: Processes deaths during the battle.
- `processPrize(address player)`: Awards tokens to the player based on their win streak.
- `setTokenAddress(address tokenAddress)`: Sets the token contract address.
- `setCardsAddress(address cardsAddress)`: Sets the cards contract address.

### `Cards.sol`

This contract manages the cards, which are ERC721 tokens with additional attributes like attack, health, and ability.

#### Key Functions

- `mintCard(address _to, uint8 _attack, uint8 _health, uint8 _ability)`: Mints a new card with the given stats and ability.
- `setAbilityPriority(uint8 abilityId, uint8 priority)`: Sets the priority of an ability.
- `getAbilityPriority(uint8 abilityId)`: Returns the priority of an ability.
- `getAbilityByPriority(uint8 priority)`: Returns the ability of a priority.

### `Token.sol`

This contract manages the fungible tokens used as rewards in the game.

#### Key Functions

- `mintToken(address to, uint256 amount)`: Mints tokens to the specified address.
- `setInitialMinter(address _initialMinter)`: Sets the initial minter address.

## Deployment

To deploy the contracts, use the `deployContracts` function in `deploy_scripts/main.ts`.


```15:50:contracts/deploy_scripts/main.ts
export async function deployContracts(): Promise<IDeployContractsOutput> {
  const creator = (await ethers.getSigners())[0];
  const Token = await ethers.getContractFactory("Token");

  const CardsContract = await ethers.deployContract(
    "Cards",
    creator,
  );

  await CardsContract.deployed();

  const CardGameLogicContract = await ethers.deployContract(
    "CardGameLogic",
    [CardsContract.address],
  );

  await CardGameLogicContract.deployed();
  const TokenContract = await Token.deploy(
    CardGameLogicContract.address,
  );

  await TokenContract.deployed();

  await CardGameLogicContract.setTokenAddress(
    TokenContract.address,
  );

  console.log(await TokenContract.initialMinter());

  return {
    Token: TokenContract as Token,
    Cards: CardsContract as Cards,
    CardGameLogic:
      CardGameLogicContract as CardGameLogic,
  };
}
```


## Testing

The tests are written using Mocha and Chai and can be found in the `test` directory. To run the tests, use the following command:

```bash
npx hardhat test
```

## Scripts

- `clean`: Cleans the project.
- `compile`: Compiles the contracts.
- `deploy-locally`: Deploys the contracts locally.
- `deploy:network`: Deploys the contracts to a specified network.
- `test`: Runs the tests.
- `typechain`: Generates TypeScript typings for the contracts.

## Configuration

The project uses Hardhat for development and testing. The configuration can be found in `hardhat.config.ts`.


```1:64:contracts/hardhat.config.ts
import "hardhat-etherscan-abi";
import "@nomiclabs/hardhat-waffle";
import "@xyrusworx/hardhat-solidity-json";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-contract-sizer";
import { HardhatUserConfig } from "hardhat/config";

const mnemonic =
  "major ostrich lake feed mean term sort essay claw catch deal toddler naive subject inmate";

const accounts = {
  count: 10,
  initialIndex: 0,
  mnemonic,
  path: "m/44'/60'/0'/0",
};

export const config: HardhatUserConfig & any = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts,
      chainId: 43114,
      blockGasLimit: 30000000,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    compilers: [
      { version: "0.8.20", settings: {} },
      { version: "0.8.12", settings: {} },
      { version: "0.8.9", settings: {} },
      { version: "0.8.0", settings: {} },
      { version: "0.6.2", settings: {} },
    ],
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/solidity-template/issues/31
        bytecodeHash: "none",
      },
      // You should disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 1, // https://docs.soliditylang.org/en/v0.8.9/internals/optimizer.html#optimizer-parameter-runs
      },
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};
```


## License

This project is licensed under the MIT License.
