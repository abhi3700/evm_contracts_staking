import { ethers } from "hardhat";
import chai from "chai";
import { BigNumber, Contract, Signer, Wallet } from "ethers";
import { deployContract, solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import GenericERC20Artifact from "../build/artifacts/contracts/helper/GenericERC20.sol/GenericERC20.json"
import { GenericERC20 } from "../build/typechain/GenericERC20"

chai.use(solidity);
const { expect } = chai;

describe("Staking contract", () => {
  let stakingContractAddress: string;
  let signers: Array<Signer>
  let owner : SignerWithAddress, 
      owner2 : SignerWithAddress, 
      addr1 : SignerWithAddress, 
      addr2 : SignerWithAddress, 
      addr3 : SignerWithAddress, 
      addr4 : SignerWithAddress;
  let token: Contract,
      stakingContract: Contract;

  beforeEach(async () => {
    // get signers
    // M-1
/*    const signers = await ethers.getSigners();
    owner = signers[0];
    owner2 = signers[1];
    addr1 = signers[3];
    addr2 = signers[4];
    addr3 = signers[5];
    addr4 = signers[6];
*/

    // M-2
    [owner, owner2, addr1, addr2, addr3, addr4] = await ethers.getSigners();


    // ---------------------------------------------------
    // M-1
    // deploy token contract
    const tokenFactory = await ethers.getContractFactory('Token');
    token = await tokenFactory.deploy();

    console.log(`Token owner: ${await token.owner()}`);


    // M-2
    // Deploy Prezrv tokens
    // token = (await deployContract(owner as Wallet, GenericERC20Artifact, [
    //   "Prezrv Token", 
    //   "PREZRV",
    // ])) as GenericERC20

    // console.log("check balance started...");
    // expect(await token.balanceOf(owner).to.eq(String(0)));    // without minting
    // console.log("check balance ended...");

    // expect(await token.totalSupply()).to.eq(BigNumber.from(String(1e24)));      // 1M token minted at constructor
    expect(await token.totalSupply()).to.eq(BigNumber.from("1000000000000000000000000"));      // 1M token minted at constructor

    // ---------------------------------------------------
    // deploy staking contract
    const stakingFactory = await ethers.getContractFactory('Staking');
    stakingContract = await stakingFactory.deploy(token.address);
    stakingContractAddress = stakingContract.address;

    expect(stakingContractAddress).to.not.eq(0);

    console.log(`Staking owner: ${await stakingContract.owner()}`);

    // mint 10,000 tokens to each addr1, addr2
    // await token.connect(owner.address).mint(addr1.address, String(1e22));
    // await token.connect(owner.address).mint(addr2.address, String(1e22));
    await token.mint(addr1.address, BigNumber.from("10000000000000000000000"));
    await token.mint(addr2.address, BigNumber.from("10000000000000000000000"));


    // verify balance of addr1, addr2 as 10k PREZRV tokens
    expect(await token.balanceOf(addr1.address)).to.eq(BigNumber.from("10000000000000000000000"));
    expect(await token.balanceOf(addr2.address)).to.eq(BigNumber.from("10000000000000000000000"));
  });

  describe("Stake function", async () => {
    it("Reverts when wrong token address is parsed", async () => {
      // Ensure that the staking contract is created
      // console.log(`Staking owner: ${await stakingContract.owner()}`);

      // first approve the 1e20 i.e. 100 PREZRV tokens to the contract
      token.connect(addr3).approve(stakingContract.address, BigNumber.from("100000000000000000000"));
      console.log(await token.allowance(addr3.address, stakingContract.address));

      // parse addr1 as token contract address into stake() function
      // parse addr2 as the account where staked,
      // parse 1e20 i.e. 100 PREZRV tokens as the 
      await expect(
        stakingContract.connect(addr3).stake(addr1.address, addr2.address, BigNumber.from("100000000000000000000")))
            .to.be.revertedWith("Invalid token");
    });

    it("Owner is able to transfer ownership", async () => {
      
    });

    it("Owner is able to pause", async () => {
      
    });

    it("Reverts when paused", async () => {

    });

  });

});



/*  beforeEach(async () => {
    const [deployer] = await ethers.getSigners();
    const tokenFactory = new TestToken__factory(deployer);
    const tokenContract = await tokenFactory.deploy();
    tokenAddress = tokenContract.address;

    expect(await tokenContract.totalSupply()).to.eq(0);
  });
  describe("Mint", async () => {
    it("Should mint some tokens", async () => {
      const [deployer, user] = await ethers.getSigners();
      const tokenInstance = new TestToken__factory(deployer).attach(tokenAddress);
      const toMint = ethers.utils.parseEther("1");

      await tokenInstance.mint(user.address, toMint);
      expect(await tokenInstance.totalSupply()).to.eq(toMint);
    });
  });

  describe("Transfer", async () => {
    it("Should transfer tokens between users", async () => {
      const [deployer, sender, receiver] = await ethers.getSigners();
      const deployerInstance = new Staking__factory(deployer).attach(tokenAddress);
      const toMint = ethers.utils.parseEther("1");

      await deployerInstance.mint(sender.address, toMint);
      expect(await deployerInstance.balanceOf(sender.address)).to.eq(toMint);

      const senderInstance = new Staking__factory(sender).attach(tokenAddress);
      const toSend = ethers.utils.parseEther("0.4");
      await senderInstance.transfer(receiver.address, toSend);

      expect(await senderInstance.balanceOf(receiver.address)).to.eq(toSend);
    });

    it("Should fail to transfer with low balance", async () => {
      const [deployer, sender, receiver] = await ethers.getSigners();
      const deployerInstance = new Staking__factory(deployer).attach(tokenAddress);
      const toMint = ethers.utils.parseEther("1");

      await deployerInstance.mint(sender.address, toMint);
      expect(await deployerInstance.balanceOf(sender.address)).to.eq(toMint);

      const senderInstance = new Staking__factory(sender).attach(tokenAddress);
      const toSend = ethers.utils.parseEther("1.1");

      // Notice await is on the expect
      await expect(senderInstance.transfer(receiver.address, toSend)).to.be.revertedWith(
        "transfer amount exceeds balance",
      );
    });
  });
*/

