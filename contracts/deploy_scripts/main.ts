import "../hardhat.config";
import { ethers } from "hardhat";
import {
  CardGameLogic,
  Cards,
  Token,
} from "../typechain";

export interface IDeployContractsOutput {
  Token: Token;
  Cards: Cards;
  CardGameLogic: CardGameLogic;
}

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
