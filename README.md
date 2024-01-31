# Ex Populus Blockchain Developer Take-Home

## Overview
Congratulations on making it to this step in our hiring process. This repo will be used by us to assess your EVM blockchain development skills. We've prepared a small ecosystem of contracts meant to reflect a very lean version of a real product we are developing. You'll also find several user stories to complete that are based on real feature requests we've built.

## Your Task
You are to complete the user stories present in this repository. They are designed to test your ability to understand & architect solutions for feature requirements that you would commonly have to tackle in our team. The stories each have specific acceptance criteria that you should aim to meet. However, the stories have also been made open-ended for you to make decisions about anything not explicitly detailed in the acceptance criteria.

### Editing
While working on the take-home, you may edit the project files in any way you want. You can add any new contracts and functions you deem necessary. You're also free to modify structs & add libraries to the project if you want. What you must use however, are Solidity & Hardhat, and at minimum, the 3 contracts already in this repo. Everything else is your call.

### Introduction to the Card Game
Our current in-house project that this take-home is inspired by, Final Form, is a fully-decentralized PvE card battler. This means the entirety of our game logic exists on-chain, and if Ex Populus were to cease support for the game, it would continue to be playable in perpetuity.

You will be delivering user stories to complete a heavily simplified version of the game.

<b>Cards</b> The player's "cards" in the game are represented by unique NFTs that can be traded freely between players. New cards enter the game via periodic new "set" drops, controlled by Ex Populus over the course of our support for the game.

<b>Gameplay</b> Users play the game by submitting a "hand" of a select few of their owned cards, which get pitted against a random selection of other existing cards. (The visual aspect of gameplay is handled via a Unity game client which you do not need to worry about). The battle will be decided based on the stats & abilities of the cards involved, explained in the [Game Loop section](#game-loop).

<b>Health</b> The amount of health a card has; how much damage it can take before dying.

<b>Attack</b> The amount of damage a card deals during an attack.

<b>Abilities</b> Special powers that each card has 1 of, detailed later, resulting in unique effects.

<b>Priority</b> The priority of an ability deteremines the order that abilities should be run, a lower number means the ability should run first.

## Point Values
We have also included point values that indicate the effort we expect each user story to take. This is not a hard rule, but a guideline to help you manage your time.

## Testing your stories
We have created a simple testsuite using mocha & chai for you to write tests for the features you create. [UnitTests.ts](./takehome-contracts/test/UnitTests.ts) is divided into 5 "describe" blocks to capture each user story. The amount of individual tests you write within is up to you, but pretend you were submitting each feature for approval to your product manager - how much coverage are you comfortable with before submitting to prevent having you work rejected?

Feel free to combine multiple acceptance criteria into single tests if appropriate, for example, we have put a single placeholder test in place that can reasonably be used for the first 2 bullet points of User Story #1.

You will possibly also want to make modifications to the [deploy script](./takehome-contracts/deploy_scripts/main.ts), `deployContracts` function which runs at the start of the testsuite. The `creator` in deployContracts should be the same wallet as `this.signers.creator` in the rest of the [UnitTests.ts](./takehome-contracts/test/UnitTests.ts) file. We also add 2 extra signers for easy access, add more if needed. 

We've also left a commented example of interfacing with the contracts after they're deployed. 

## User Story #1 (Minting) [1 Point]
As a member of Ex Populus who is responsible for controlling the game's card-economy & influx of new cards, I want to be able to mint new cards in the game to specified users. Once a card is minted to a user, it can then be used to play the game or appear as a potential enemy card when someone is playing the game.

### Acceptance Criteria
- [x] I can call a function to mint a new card to a specific player.
- [x] I can call a lookup function to find the minted card details by passing in an id.
- [x] This function should only be callable by the address that deployed the contract in the first place, or specific addresses approved by the original deployer.
- [x] When I call the mint function, I should be required to specify the health, attack, and ability for the card in question. The ability value should be limited only to 0, 1, or 2.
- [x] Each card that gets minted should be saved with a unique id.

## User Story #2 (Ability Configuration) [1 Point]
As a member of Ex Populus, I want the ability to define the "priorities" of abilities in the game, so that when players run battles, cards have their abilities processed in a balanced order.

### Acceptance Criteria
- [x] The Director has informed us that the game will feature 3 abilities at launch. I want to make sure the mint function from User Story 1 reflects this so that I can only mint cards with ability numbers 0, 1, or 2.
- [x] I want a function, with the same level of permissions that the `mint` function from User Story 1 has, where I can define the "priority" for a specific ability.
- [x] The function needs to accept an ability id & a number representing priority for that ability.
- [x] I can call the function to update the priority for an ability multiple times, but I cannot set multiple abilities to have the same priority.

### Notes
The Director has given us details of the 3 abilities the game will have at launch, they are:
1. <b>Shield (Ability 0)</b>: Protects the casting card from any incoming damage or the effects of the freeze ability for the current turn
2. <b>Roulette (Ability 1)</b>: The casting card has a 10% chance to instantly end the game (by killing all opposite deck cards & bypassing the opposite card's "shield", if any) in its team's favor resulting in a win for the team. 
3. <b>Freeze (Ability 2)</b>: Prevents the other deck's front card from performing any abilities or basic attack for the rest of the turn.

As of now the Director tells us that the ability execution priority is Shield > Freeze > Roulette. It is important to note that an ability's id differs from its priority, hence the existence of this user story, and also so the abilities can be balanced in the future via altering their order.   

The effects of these functions will be relevant for User Story #3.

## User Story #3 (Battles & Game Loop) [3 Points]
As a player, I want to run a battle in the game and see the result.

### Acceptance Criteria
- [x] I can call the `battle` function, and pass in up to 3 nft ids representing my owned cards. I cannot use the same nft more than once in a single battle.
- [x] I should get an error if any of the ids I submitted are not owned by me.
- [x] An "enemy" deck, always containing 3  cards, should be generated for my cards to battle against by picking any 3 existing, in-circulation nft ids from the `ExPopulusCards` contract at random. 
- [x] The outcome of the battle is determined based on the game loop defined below.
- [x] if I win the battle, I want a number incremented to represent my win "streak", which resets to any time I *lose* a battle.
- [x] Player's win streaks can be looked up via their wallet address.  
- [x] When 2 cards abilities are being compared to determine which takes priority, the function should error if one of the abilities does not have a priority set via the functionality introduced in User Story 2.
- [x] If the 2 cards facing off have the same ability, priority is given to the player's card to go first.

### <a id="game-loop">Game loop</a>
The game loop should have 3 main parts, abilities, basic attacks, and death handling. The cards are ordered in their respective arrays with the player's "first" card being the 0th index in their submission to the `battle` function.
1. *Front* cards on both sides will have their ability priorities checked (defined in the previous user story), and then processed in order. A card will only use its ability a single time, the first "turn" that it is front of the queue. If a card survives more than 1 turn in the front, it will not perform its ability a second time on the subsequent turn. In this take-home, there are no abilities that inflict damage.
2. The front cards both perform their "basic" attacks against each other at the same time. A basic attack is a simple health vs attack check, so consider the example...
   1. Player card has 5 health and 1 attack, Enemy card has 4 health and 2 attack
   2. Basic attack processed
   3. Player & enemy cards both end up with 3 health remaining
   4. A card is considered dead when its health hits 0
3. Death processing; If either card dies during basic attack processing, that card can be ignored for the remainder of the battle, and now one of a few things happens:
   1. If the team whose card died still has living cards on their team, the next card in the array becomes the "front" card, and the game loop repeats.
   2. If *both* cards die at the same time from the basic attacks and both teams have no remaining cards left, the battle ends in a `draw`. (Otherwise if both sides have remaining cards apply logic from point i. to both  teams & continue the loop)
   3. If the team whose card died has no remaining living cards, that team is the loser, resulting in either a `win` or `loss` for the player, depending on which side they were in this example.

## User Story #4 (Fungible Token & Battle Rewards) [1 Point]
As a player, when I win a battle, I want to be rewarded in the form of a fungible token.

### Acceptance Criteria
- [ ] The ExPopulusToken contract represents a fungible token & tracks the balance of each player
- [ ] The `mintToken` function should take an address & quantity to determine who to mint to & how many tokens.
- [ ] The `mintToken` function should only be callable by the initial deployer of the contract AND the ExPopulusCardGameLogic smart contract.
- [ ] When a player wins a battle from User Story 3 they should be rewarded 100 fungible tokens in the ExPopulusToken contract, or 1000 tokens if their win was a multiple of 5 (5th, 10th, 15th win, etc).

### Notes
To keep things brief, this take-home only needs minting & balance tracking for the fungible token. No need to implement the full ERC20 standard, but if you want or find it easier, feel free to do so.

## User Story #5 (Battle Logs & Historical Lookup) [2 Points]
As a Unity game developer working on the GUI for the card game, I want a reliable way to visually represent a battle after it happens on-chain, to the player. (Without having to repeat any game-logic; ALL game logic exists on-chain only, and the Unity client is simply a visual way for players to interact with our contract functions)

### Acceptance Criteria
- [x] The `battle` function tracks data in a format to be decided by the developer that details the every ability cast, basic attack performed, death, and game-end, in order.
  - The `battle` function logic gets updated to write into this data as the logic executes so that it can be queried later.
- [ ] The "battle data" gets written into storage in the smart contract by a unique identifier so a Player can look up the battle again at a later date to see what happened. The unique identifier is returned from the function to be used for this purpose.

### Notes
The battle data should be easily expandable in the future, and the implementation should take into consideration that down the road, battles will get much more complex. So, if possible, try to create a solution that doesn't use tons of contract space to track this data as the battle is running.

If that battle data requires documentation to interpret, then please provide that as well. If you think the data is easy to comprehend on its own, then you don't need to document it.

# Example

This is a link to a video of the beta version of the game. It has scope that is outside what is assigned to you in this document, but if you want a visualization of what type of game these contracts would support, then check it out.

https://drive.google.com/file/d/1-WIJJ8YX1m4Me5m5sQ77A6jEoUMZfh5n/view?usp=sharing

# Initialization & Running Steps
The project is set up with Node 18.16.0. We recommend using Node Version Manager, but that is up to you.

## Installation

We are using PNPM, not NPM. To install PNPM:
```
npm install -g pnpm
```

Next, in the root of the project:
```
pnpm install
```

## Contract compilation & sizing

You should be able to enjoy typing & code auto complete in your tests as long as you remember to compile your contracts as you make changes to them!

Now navigate to `/takehome-contracts`

To check your contract sizes (and compile them):
```
npx hardhat size-contracts
```

To just compile your contracts without checkin their size:
```
pnpm run typechain
```

## Running the testsuite

Finally, to actually run your tests:
```
npx hardhat test
```

# Submission Guidelines

After you complete the user stories, you can submit your work in one of 2 ways:

1. **GitHub:**
   - Push your solution to a GitHub repository.
   - Ensure the repository is public.
   - Provide the repository link to us via email.

2. **Email Submission:**
   - Zip the entire project folder.
   - Include the zipped file back as an attachment in your response email.
