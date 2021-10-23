// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Context.sol';
import 'hardhat/console.sol';

/**
 * @notice A Staking contract for PREZRV
 */
contract Staking is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ==========State variables====================================
    IERC20 public stakingToken;

    // token limits for staked amount for different features
    uint256 public nftUnlockTokenLimit;
    uint256 public nftServTokenLimit;
    uint256 public daoTokenLimit;
    uint256 constant public STAKE_DURATION = 2_629_746;     // 1 month in seconds

    // Stake struct type for balances variable
    // stores total staked amount yet from the beginning till 
    // the timestamp (referred to) for an address
    struct Stake {
        uint256 amount;
        uint256 stakedAmtTotYet;
    }

    // user -> (timestamp -> stakeAmt) 
    mapping (address => mapping(uint256 => Stake) ) public balances;

    // stores total staked amount from the beginning for an address
    // user -> totalStakedAmt
    mapping (address => uint256) totalBalances;

    // ==========Events=============================================
    event TokenStaked(address indexed staker, uint256 indexed amount, uint256 indexed stakeTimestamp);
    event NFTUnlockTokenLimitSet(uint256 indexed amount, uint256 indexed setTimestamp);
    event NFTServTokenLimitSet(uint256 indexed amount, uint256 indexed setTimestamp);
    event DAOTokenLimitSet(uint256 indexed amount, uint256 indexed setTimestamp);
    // ==========Constructor========================================
    constructor(
        IERC20 _token
    ) {
        require(address(_token) != address(0), "Invalid address");
        
        stakingToken = _token;
    }

    // ==========Functions==========================================
    /// @notice User Stake tokens
    /// @dev User approve tokens & then use this function
    /// @param _token token contract address
    /// @param _amount token amount for staking
    function stake(IERC20 _token, address account, uint256 _amount) external whenNotPaused nonReentrant {
        require(_token != stakingToken, "Invalid token");
        require(account != address(0), "account must be non-zero");
        require(_amount > 0, "amount must be positive");

        // read the total staked amount
        uint256 totStakedAmt = totalBalances[account];

        // update the balances
        balances[account][block.timestamp].amount = _amount;
        balances[account][block.timestamp].stakedAmtTotYet = totStakedAmt.add(_amount);

        // update the total staked amount
        totalBalances[account] = totStakedAmt.add(_amount);

        // transfer to SC using delegate transfer
        // NOTE: the tokens has to be approved first by the caller to the SC using `approve()` method.
        bool success = stakingToken.transferFrom(_msgSender(), address(this), _amount);
        require(success, "stakingToken.transferFrom function failed");
        emit TokenStaked(_msgSender(), _amount, block.timestamp);
    }

    // -------------------------------------------------------------
    /// @notice Admin set token limit for unlocking NFTs to users
    /// @dev accessible by Owner
    /// @param amount the amount to be updated as the new token limit
    function setNFTUnlockTokenLimit(uint256 amount) external onlyOwner whenNotPaused {
        require(amount > 0, "amount must be positive");

        nftUnlockTokenLimit = amount;
        emit NFTUnlockTokenLimitSet(amount, block.timestamp);
    }

    // -------------------------------------------------------------
    /// @notice Admin set token limit for unlocking NFT related services to users
    /// @dev accessible by Owner
    /// @param amount the amount to be updated as the new token limit
    function setNFTServTokenLimit(uint256 amount) external onlyOwner whenNotPaused {
        require(amount > 0, "amount must be positive");

        nftServTokenLimit = amount;
        emit NFTServTokenLimitSet(amount, block.timestamp);
    }

    // -------------------------------------------------------------
    /// @notice Admin set token limit for accessing DAO to users
    /// @dev accessible by Owner
    /// @param amount the amount to be updated as the new token limit
    function setDAOTokenLimit(uint256 amount) external onlyOwner whenNotPaused {
        require(amount > 0, "amount must be positive");

        daoTokenLimit = amount;
        emit DAOTokenLimitSet(amount, block.timestamp);
    }

    // -------------------------------------------------------------
    /// @notice Anyone can view staked amount of a user at a timestamp
    /// @dev no permission required
    /// @param account account for which staked amount by index is asked for
    /// @param timestamp timestamp at which amount is staked
    /// @return total staked amount at given timestamp
    function getStakedAmtAtTstamp(address account, uint256 timestamp) public view returns (uint256) {
        require(account != address(0), "Invalid address");
        require(totalBalances[account] != 0, "No staking done for this account");
        require(balances[account][timestamp].amount != 0, "No staking done for this account at parsed timestamp");
        require(timestamp > 0 && timestamp > block.timestamp, "Invalid timestamp");

        return balances[account][timestamp].amount;
    }

    // -------------------------------------------------------------
    /// @notice Anyone can view total staked amount of a user till this timestamp
    /// @dev no permission required
    /// @param account account for which total staked amount by timestamp is asked for
    /// @param timestamp timestamp by which total staked amount is returned
    /// @return total staked amount till timestamp
    function getStakedTotAmtTillTstamp(address account, uint256 timestamp) public view returns (uint256) {
        require(account != address(0), "Invalid address");
        require(totalBalances[account] != 0, "No staking done for this account");
        require(balances[account][timestamp].stakedAmtTotYet != 0, "No staking done for this account till this timestamp");
        require(timestamp > 0 && timestamp > block.timestamp, "Invalid timestamp");

        return balances[account][timestamp].stakedAmtTotYet;
    }

    // -------------------------------------------------------------
    /// @notice Anyone can view total staked amount of a user till date
    /// @dev no permission required
    /// @param account account for which total staked amount is asked for
    /// @return total staked amount
    function getStakedAmtTot(address account) public view returns (uint256) {
        require(account != address(0), "Invalid address");
        require(totalBalances[account] != 0, "No staking done for this account");

        return totalBalances[account];
    }

    // -------------------------------------------------------------
    /// @notice View User's status of eliqibility for getting access to platform features
    /// @dev viewable by anyone
    /// @param account user's address
    /// @return 0-> not staking for min. duration, 1-> NFT unlock, 2-> NFT services, 3-> DAO
    function getUserStatus(address account) external view returns (uint256) {
        require(account != address(0), "Invalid address");
        require(totalBalances[account] != 0, "No staking done for this account");

        uint256 stakedAmountTot = totalBalances[account];

        if (stakedAmountTot >= 500) return 1;
        else if (stakedAmountTot >= 1000) return 2;
        else if (stakedAmountTot >= 1500) return 3;
        else return 0;
    }

}
