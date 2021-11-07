import { ethers } from "hardhat";
import chai from "chai";
import { BigNumber, Contract, Signer, Wallet } from "ethers";
import { deployContract, solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import GenericERC20Artifact from "../build/artifacts/contracts/helper/GenericERC20.sol/GenericERC20.json"
import { GenericERC20 } from "../build/typechain/GenericERC20"
import {
	MAX_UINT256,
	TIME,
	ZERO_ADDRESS,
	// asyncForEach,
	// deployContractWithLibraries,
	getCurrentBlockTimestamp,
	// getUserTokenBalance,
	// getUserTokenBalances,
	setNextTimestamp,
	setTimestamp,
} from "./testUtils"

chai.use(solidity);
const { expect } = chai;

describe("Staking contract", () => {
	let stakingContractAddress: string;
	let signers: Array<Signer>;
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
		// console.log(`Token contract address: ${token.address}`);

		// console.log(`Token owner: ${await token.owner()}`);


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
		// console.log(`Staking contract address: ${stakingContract.address}`);

		expect(stakingContractAddress).to.not.eq(0);

		// console.log(`Staking owner: ${await stakingContract.owner()}`);

		// mint 10,000 tokens to each addr1, addr2, addr3
		await token.mint(addr1.address, BigNumber.from("10000000000000000000000"));
		await token.mint(addr2.address, BigNumber.from("10000000000000000000000"));
		await token.mint(addr3.address, BigNumber.from("10000000000000000000000"));

		// verify 10,000 tokens as balance of addr1, addr2, addr3
		expect(await token.balanceOf(addr1.address)).to.eq(BigNumber.from("10000000000000000000000"));
		expect(await token.balanceOf(addr2.address)).to.eq(BigNumber.from("10000000000000000000000"));
		expect(await token.balanceOf(addr3.address)).to.eq(BigNumber.from("10000000000000000000000"));

	});

	describe("Ownable", async () => {
		it("Owner is able to transfer ownership", async () => {
			await expect(stakingContract.transferOwnership(owner2.address))
				.to.emit(stakingContract, 'OwnershipTransferred')
				.withArgs(owner.address, owner2.address);
		});
	});

	describe("Pausable", async () => {
		it("Owner is able to pause when NOT paused", async () => {
			await expect(stakingContract.pause())
				.to.emit(stakingContract, 'Paused')
				.withArgs(owner.address);
		});

		it("Owner is able to unpause when already paused", async () => {
			stakingContract.pause();

			await expect(stakingContract.unpause())
				.to.emit(stakingContract, 'Unpaused')
				.withArgs(owner.address);
		});

		it("Owner is NOT able to pause when already paused", async () => {
			stakingContract.pause();

			await expect(stakingContract.pause())
				.to.be.revertedWith("Pausable: paused");
		});

		it("Owner is NOT able to unpause when already unpaused", async () => {
			stakingContract.pause();

			stakingContract.unpause();

			await expect(stakingContract.unpause())
				.to.be.revertedWith("Pausable: not paused");
		});
	});

	describe("Stake", async () => {
		it("Succeeds with staking by other", async () => {
			// console.log(`Token owner: ${await token.owner()}`);
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

					// const currentTimestamp = await getCurrentBlockTimestamp();

			// addr3 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr3.address, BigNumber.from("10000000000000000000"), await getCurrentBlockTimestamp());

		});

		it("Succeeds with staking by self", async () => {
			// console.log(`Token owner: ${await token.owner()}`);
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr2).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

					// const currentTimestamp = await getCurrentBlockTimestamp();

			// addr2 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr2).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr2.address, BigNumber.from("10000000000000000000"), await getCurrentBlockTimestamp());

		});

		it("Reverts when address is zero", async () => {
			// console.log(`Token owner: ${await token.owner()}`);
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// parse addr1 as token contract address into stake() function
			// parse addr2 as the account where staked,
			// parse 0 PREZRV tokens
			await expect(
			stakingContract.connect(addr3).stake(ZERO_ADDRESS, BigNumber.from("10000000000000000000")))
				.to.be.revertedWith("Account must be non-zero");
		});

		it("Reverts when amount is zero", async () => {
			// console.log(`Token owner: ${await token.owner()}`);
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// parse addr1 as token contract address into stake() function
			// parse addr2 as the account where staked,
			// parse 0 PREZRV tokens
			await expect(
			stakingContract.connect(addr3).stake(addr2.address, BigNumber.from(0)))
				.to.be.revertedWith("Amount must be positive");
		});

		it("Reverts when paused", async () => {
			// Pause the contract
			await expect(stakingContract.pause())
				.to.emit(stakingContract, 'Paused')
				.withArgs(owner.address);

			// Execute the `stake` function
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// parse addr1 as token contract address into stake() function
			// parse addr2 as the account where staked,
			// parse 1e19 i.e. 10 PREZRV tokens 
			await expect(
			stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.be.revertedWith("Pausable: paused");
		});

	});

	describe("Unstake", async () => {
		it("Succeeds with unstaking", async () => {
			// check balance of addr2 before staking
			const addr2BalanceBefore = await token.balanceOf(addr2.address);

			// console.log(`Token owner: ${await token.owner()}`);
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr2).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

					// const currentTimestamp = await getCurrentBlockTimestamp();

			// addr2 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr2).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr2.address, BigNumber.from("10000000000000000000"), await getCurrentBlockTimestamp());

			// read latest timestamp by last index added into the userTimestamps
			const latestTimestamp = (await stakingContract.getLastTstamp(addr2.address)).toNumber();
			// console.log(latestTimestamp);

			// unstake at the last timestamp
			await expect(stakingContract.connect(addr2).unstakeAt(latestTimestamp, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenUnstakedAt");

			// check balance of addr2 is same as before staking
			const addr2BalanceAfter = await token.balanceOf(addr2.address);
			await expect(addr2BalanceAfter.sub(addr2BalanceBefore)).to.eq(0);

		});

		it("Reverts when parsed timestamp is greater than the current timestamp", async () => {
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr2).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			/// addr2 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr2).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");

			// read latest timestamp by last index added into the userTimestamps
			const latestTimestamp = (await stakingContract.getLastTstamp(addr2.address)).toNumber();

			// unstake at the (latest timestamp + 1)
			await expect(stakingContract.connect(addr2).unstakeAt(latestTimestamp+1, BigNumber.from("10000000000000000000")))
				.to.be.revertedWith("Stake timestamp must be less than the current timestamp");

		});

		it("Reverts when amount is zero", async () => {
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr2).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// addr2 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr2).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");

			// read latest timestamp by last index added into the userTimestamps
			const latestTimestamp = (await stakingContract.getLastTstamp(addr2.address)).toNumber();

			// unstake at the last timestamp with zero amount
			await expect(stakingContract.connect(addr2).unstakeAt(latestTimestamp, BigNumber.from(0)))
				.to.be.revertedWith("Amount must be positive");
		});

		it("Reverts due to insufficient stake amount at timestamp", async () => {
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr2).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// addr2 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr2).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");

			// read latest timestamp by last index added into the userTimestamps
			const latestTimestamp = (await stakingContract.getLastTstamp(addr2.address)).toNumber();

			// unstake at the last timestamp with 11 amount
			await expect(stakingContract.connect(addr2).unstakeAt(latestTimestamp, BigNumber.from("11000000000000000000")))
				.to.be.revertedWith("Insufficient staked amount at this timestamp");
		});

		it("Reverts due to invalid stake timestamp", async () => {
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr2).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// addr2addr2 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr2).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");

			// read latest timestamp by last index added into the userTimestamps
			const latestTimestamp = (await stakingContract.getLastTstamp(addr2.address)).toNumber();

			// unstake at the random timestamp with 5 amount
			await expect(stakingContract.connect(addr2).unstakeAt(latestTimestamp-1, BigNumber.from("10000000000000000000")))
				.to.be.revertedWith("Invalid stake timestamp for user");
		});

		it("Reverts when paused", async () => {
			// Pause the contract
			await expect(stakingContract.pause())
				.to.emit(stakingContract, 'Paused')
				.withArgs(owner.address);

			// Execute the `stake` function
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr2).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			/// addr2 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr2).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.be.revertedWith("Pausable: paused");

			// unstake at the random timestamp with 5 amount
			await expect(stakingContract.connect(addr2).unstakeAt(await getCurrentBlockTimestamp()+5, BigNumber.from("5000000000000000000")))
				.to.be.revertedWith("Pausable: paused");
		});

	});

	describe("Set token limit for NFT unlocking", async () => {
		it("Succeeds in setting token limit", async () => {
			// owner set 500 PREZRV as token limit for NFT unlocking
			await expect(
			stakingContract.connect(owner).setNFTUnlockTokenLimit(BigNumber.from("500000000000000000000")))
				.to.emit(stakingContract, 'NFTUnlockTokenLimitSet');
				// .withArgs(BigNumber.from("500000000000000000000"), await getCurrentBlockTimestamp());
		});

		it("Reverts when limit set by non-owner", async () => {
			// addr3 set 500 PREZRV as token limit for NFT unlocking
			await expect(
			stakingContract.connect(addr3).setNFTUnlockTokenLimit(BigNumber.from("500000000000000000000")))
				.to.be.revertedWith("Ownable: caller is not the owner");
		});

		it("Reverts when amount is zero", async () => {
			// owner set 0 PREZRV as token limit for NFT unlocking
			await expect(
			stakingContract.connect(owner).setNFTUnlockTokenLimit(BigNumber.from(0)))
				.to.be.revertedWith("Amount must be positive");
		});

		it("Reverts when paused", async () => {
			// Pause the contract
			await expect(stakingContract.pause())
				.to.emit(stakingContract, 'Paused')
				.withArgs(owner.address);

			// owner set 500 PREZRV as token limit for NFT unlocking
			await expect(
			stakingContract.connect(owner).setNFTUnlockTokenLimit(BigNumber.from("500000000000000000000")))
				.to.be.revertedWith("Pausable: paused");
		});

	});

	describe("Set token limit for NFT services", async () => {
		it("Succeeds in setting token limit", async () => {
			// owner set 1000 PREZRV as token limit for NFT unlocking
			await expect(
			stakingContract.setNFTServTokenLimit(BigNumber.from("1000000000000000000000")))
				.to.emit(stakingContract, 'NFTServTokenLimitSet');
				// .withArgs(BigNumber.from("1000000000000000000000"), await getCurrentBlockTimestamp());
		});

		it("Reverts when limit set by non-owner", async () => {
			// addr3 set 1000 PREZRV as token limit for NFT services
			await expect(
			stakingContract.connect(addr3).setNFTServTokenLimit(BigNumber.from("1000000000000000000000")))
				.to.be.revertedWith("Ownable: caller is not the owner");
		});

		it("Reverts when amount is zero", async () => {
			// owner set 0 PREZRV as token limit for NFT services
			await expect(
			stakingContract.connect(owner).setNFTServTokenLimit(BigNumber.from(0)))
				.to.be.revertedWith("Amount must be positive");
		});

		it("Reverts when paused", async () => {
			// Pause the contract
			await expect(stakingContract.pause())
				.to.emit(stakingContract, 'Paused')
				.withArgs(owner.address);

			// owner set 1000 PREZRV as token limit for NFT services
			await expect(
			stakingContract.connect(owner).setNFTServTokenLimit(BigNumber.from("1000000000000000000000")))
				.to.be.revertedWith("Pausable: paused");
		});

	});

	describe("Set token limit for DAO", async () => {
		it("Succeeds in setting token limit", async () => {
			// owner set 1500 PREZRV as token limit for DAO
			await expect(
			stakingContract.setDAOTokenLimit(BigNumber.from("1500000000000000000000")))
				.to.emit(stakingContract, 'DAOTokenLimitSet');
				// .withArgs(BigNumber.from("1500000000000000000000"), await getCurrentBlockTimestamp());
		});

		it("Reverts when limit set by non-owner", async () => {
			// addr3 set 1500 PREZRV as token limit for DAO
			await expect(
			stakingContract.connect(addr3).setDAOTokenLimit(BigNumber.from("1500000000000000000000")))
				.to.be.revertedWith("Ownable: caller is not the owner");
		});

		it("Reverts when amount is zero", async () => {
			// owner set 0 PREZRV as token limit for DAO
			await expect(
			stakingContract.connect(owner).setDAOTokenLimit(BigNumber.from(0)))
				.to.be.revertedWith("Amount must be positive");
		});

		it("Reverts when paused", async () => {
			// Pause the contract
			await expect(stakingContract.pause())
				.to.emit(stakingContract, 'Paused')
				.withArgs(owner.address);

			// owner set 1500 PREZRV as token limit for NFT services
			await expect(
			stakingContract.connect(owner).setDAOTokenLimit(BigNumber.from("1500000000000000000000")))
				.to.be.revertedWith("Pausable: paused");
		});

	});

	describe("Get total staked amount", async () => {
		it("Succeeds in getting total staked amount", async () => {
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// addr3 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr3.address, BigNumber.from("10000000000000000000"), await getCurrentBlockTimestamp());
		
			expect(await stakingContract.getStakedAmtTot(addr2.address))
				.to.eq(BigNumber.from("10000000000000000000"));
		});

		it("Reverts when zero address is parsed", async () => {
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// addr3 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr3.address, BigNumber.from("10000000000000000000"), await getCurrentBlockTimestamp());
		
			await expect(stakingContract.getStakedAmtTot(ZERO_ADDRESS))
				.to.be.revertedWith("Invalid address");

		});

		it("Reverts when no staking done for account", async () => {
			await expect(stakingContract.getStakedAmtTot(addr2.address))
				.to.be.revertedWith("No staking done for this account");
		});

	});

	describe("Get last staked timestamp", async () => {
		it("Succeeds in getting last staked timestamp", async () => {
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// addr3 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr3.address, BigNumber.from("10000000000000000000"), await getCurrentBlockTimestamp());
		
			expect(await stakingContract.getLastTstamp(addr2.address))
				.to.not.eq(BigNumber.from(0));
		});

		it("Reverts when zero address is parsed", async () => {
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// addr3 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr3.address, BigNumber.from("10000000000000000000"), await getCurrentBlockTimestamp());
		
			await expect(stakingContract.getLastTstamp(ZERO_ADDRESS))
				.to.be.revertedWith("Invalid address");

		});

		it("Reverts when no staking done for account", async () => {
			await expect(stakingContract.getLastTstamp(addr2.address))
				.to.be.revertedWith("No staking done for this account");
		});

	});

	describe("Get user status", async () => {
		beforeEach(async () => {
			// owner set 500 PREZRV as token limit for NFT unlocking
			await expect(
			stakingContract.connect(owner).setNFTUnlockTokenLimit(BigNumber.from("500000000000000000000")))
				.to.emit(stakingContract, 'NFTUnlockTokenLimitSet');
				// .withArgs(BigNumber.from("500000000000000000000"), await getCurrentBlockTimestamp());
			
			// owner set 1000 PREZRV as token limit for NFT unlocking
			await expect(
			stakingContract.setNFTServTokenLimit(BigNumber.from("1000000000000000000000")))
				.to.emit(stakingContract, 'NFTServTokenLimitSet');
				// .withArgs(BigNumber.from("1000000000000000000000"), await getCurrentBlockTimestamp());

			// owner set 1500 PREZRV as token limit for DAO
			await expect(
			stakingContract.setDAOTokenLimit(BigNumber.from("1500000000000000000000")))
				.to.emit(stakingContract, 'DAOTokenLimitSet');
				// .withArgs(BigNumber.from("1500000000000000000000"), await getCurrentBlockTimestamp());
		});

		it("Succeeds in getting user status 0", async () => {
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// addr3 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr3.address, BigNumber.from("10000000000000000000"), await getCurrentBlockTimestamp());
		
			expect(await stakingContract.getUserStatus(addr2.address))
				.to.eq(BigNumber.from(0));
		});

		it("Succeeds in getting user status 1", async () => {
			// first approve the 501e18 i.e. 501 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("501000000000000000000"));

			// addr3 stake 501e18 i.e. 501 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("501000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr3.address, BigNumber.from("501000000000000000000"), await getCurrentBlockTimestamp());
		
			// check after 5 weeks
			// increase the current timestamp by 5 weeks = 35 days greater than 30 days i.e. 1 month
			const currentTimestamp = await getCurrentBlockTimestamp();
			await setTimestamp(currentTimestamp + 5 * TIME.WEEKS);

			expect(await stakingContract.getUserStatus(addr2.address))
				.to.eq(BigNumber.from("1"));
		});

		it("Succeeds in getting user status 2", async () => {
			// first approve the 1001e18 i.e. 1001 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("1001000000000000000000"));

			// addr3 stake 1001e18 i.e. 1001 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("1001000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr3.address, BigNumber.from("1001000000000000000000"), await getCurrentBlockTimestamp());
		
			// check after 5 weeks
			// increase the current timestamp by 5 weeks = 35 days greater than 30 days i.e. 1 month
			const currentTimestamp = await getCurrentBlockTimestamp();
			await setTimestamp(currentTimestamp + 5 * TIME.WEEKS);

			expect(await stakingContract.getUserStatus(addr2.address))
				.to.eq(BigNumber.from("2"));
		});

		it("Succeeds in getting user status 3", async () => {
			// first approve the 1501e18 i.e. 1501 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("1501000000000000000000"));

			// addr3 stake 1501e18 i.e. 1501 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("1501000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr3.address, BigNumber.from("1501000000000000000000"), await getCurrentBlockTimestamp());
		
			// check after 5 weeks
			// increase the current timestamp by 5 weeks = 35 days greater than 30 days i.e. 1 month
			const currentTimestamp = await getCurrentBlockTimestamp();
			await setTimestamp(currentTimestamp + 5 * TIME.WEEKS);

			expect(await stakingContract.getUserStatus(addr2.address))
				.to.eq(BigNumber.from("3"));
		});


		it("Reverts when zero address is parsed", async () => {
			// first approve the 1e19 i.e. 10 PREZRV tokens to the contract
			token.connect(addr3).approve(stakingContract.address, BigNumber.from("10000000000000000000"));

			// addr3 stake 1e19 i.e. 10 PREZRV tokens for addr2
			await expect(stakingContract.connect(addr3).stake(addr2.address, BigNumber.from("10000000000000000000")))
				.to.emit(stakingContract, "TokenStaked");
				// .withArgs(addr3.address, BigNumber.from("10000000000000000000"), await getCurrentBlockTimestamp());
		
			await expect(stakingContract.getUserStatus(ZERO_ADDRESS))
				.to.be.revertedWith("Invalid address");

		});

		it("Reverts when no staking done for account", async () => {
			await expect(stakingContract.getUserStatus(addr2.address))
				.to.be.revertedWith("No staking done for this account");
		});

	});

});