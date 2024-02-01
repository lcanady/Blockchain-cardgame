import "../hardhat.config";
import { ethers } from "hardhat";
import {
  ExPopulusCardGameLogic,
  ExPopulusCards,
  ExPopulusToken,
} from "../typechain";

export interface IDeployContractsOutput {
  exPopulusToken: ExPopulusToken;
  exPopulusCards: ExPopulusCards;
  exPopulusCardGameLogic: ExPopulusCardGameLogic;
}

export async function deployContracts(): Promise<IDeployContractsOutput> {
  const creator = (await ethers.getSigners())[0];
  const ExPoopulusToken = await ethers.getContractFactory("ExPopulusToken");

  const exPopulusCardsContract = await ethers.deployContract(
    "ExPopulusCards",
    creator,
  );

  await exPopulusCardsContract.deployed();

  const exPopulusCardGameLogicContract = await ethers.deployContract(
    "ExPopulusCardGameLogic",
    [exPopulusCardsContract.address],
  );

  await exPopulusCardGameLogicContract.deployed();
  const exPopulusTokenContract = await ExPoopulusToken.deploy(
    exPopulusCardGameLogicContract.address,
  );

  await exPopulusTokenContract.deployed();

  return {
    exPopulusToken: exPopulusTokenContract as ExPopulusToken,
    exPopulusCards: exPopulusCardsContract as ExPopulusCards,
    exPopulusCardGameLogic:
      exPopulusCardGameLogicContract as ExPopulusCardGameLogic,
  };
}
