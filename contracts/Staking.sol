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
 * @title A Staking contract for PREZRV
 */
contract Staking is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ==========State variables====================================
    IERC20 public immutable stakingToken;

    // token limits for staked amount for different features
    uint256 public nftUnlockTokenLimit;
    uint256 public nftServTokenLimit;
    uint256 public daoTokenLimit;
    uint256 constant public STAKE_DURATION = 2_629_746;     // 1 month in seconds

    // user -> (timestamp -> stakeAmt) 
    mapping (address => mapping( uint256 => uint256 ) ) public balances;

    // user -> timestamps[]
    mapping (address => uint256[]) public userTimestamps;

    // stores total staked amount for an address
    // user -> totalStakedAmt
    mapping (address => uint256) totalBalances;

    // ==========Events=============================================
    event TokenStaked(address indexed staker, address indexed stakedFor, uint256 indexed amount, uint256 stakeTimestamp);
    event TokenUnstakedAt(address indexed unstaker, uint256 indexed amount, uint256 indexed stakeTimestamp);
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
    /// @param account address to where amount is staked. NOTE: msg.sender is not considered so that 
    ///         any third party address can stake for another address
    /// @param _amount token amount for staking
    /// @return true as execution status
    function stake(address account, uint256 _amount) external whenNotPaused nonReentrant returns (bool) {
        require(account != address(0), "Account must be non-zero");
        require(_amount > 0, "Amount must be positive");

        // read the total staked amount
        uint256 totStakedAmt = totalBalances[account];

        // update the balances
        balances[account][block.timestamp] = _amount;
        // balances[account][block.timestamp].stakedAmtTotYet = totStakedAmt.add(_amount);

        // Stake memory newStaking = Stake(block.timestamp, _amount);
        // balances[account].push(newStaking);

        // append the timestamp
        userTimestamps[account].push(block.timestamp);

        // update the total staked amount
        totalBalances[account] = totStakedAmt.add(_amount);

        // transfer to SC using delegate transfer
        // NOTE: the tokens has to be approved first by the caller to the SC using `approve()` method.
        bool success = stakingToken.transferFrom(_msgSender(), address(this), _amount);
        require(success, "Stake: transferFrom function failed");

        emit TokenStaked(_msgSender(), account, _amount, block.timestamp);

        return true;
    }

    /// @notice User unstake tokens
    /// @dev unstake at available timestamps in form of drop-down menu option shown in UI
    /// @param _timestamp at which the unstake is requested for
    /// @param _amount amount requested for unstaking
    /// @return true as execution status
    function unstakeAt(uint256 _timestamp, uint256 _amount) external whenNotPaused nonReentrant returns (bool) {
        require(_timestamp < block.timestamp, "Stake timestamp must be less than the current timestamp");
        require(_amount > 0, "Amount must be positive");
        
        // get found status & position of element in array
        (bool found, uint256 pos) = _getArrIdx(userTimestamps[_msgSender()], _timestamp);
        require(found, "Invalid stake timestamp for user");

        require(balances[_msgSender()][_timestamp] >= _amount, "Insufficient staked amount at this timestamp");

        // read the staked amount at timestamp
        uint256 stakedAmt = balances[_msgSender()][_timestamp];

        // update the balances
        balances[_msgSender()][_timestamp] = stakedAmt.sub(_amount);

        // update the userTimestamps
        if (stakedAmt == _amount) {
            _removebyIndex(userTimestamps[_msgSender()], pos);
        }

        // update the totalBalances
        totalBalances[_msgSender()] = totalBalances[_msgSender()].sub(_amount);

        // console.log("balance Before transfer during unstaking: %s", stakingToken.balanceOf(_msgSender()));

        // transfer back requested PREZRV tokens to caller using delegate transfer
        bool success = stakingToken.transfer(_msgSender(), _amount);
        require(success, "Unstake: transfer function failed.");

        // console.log("balance After transfer during unstaking: %s", stakingToken.balanceOf(_msgSender()));

        emit TokenUnstakedAt(_msgSender(), _amount, block.timestamp);

        return true;
    }

    // -------------------------------------------------------------
    /// @notice Admin set token limit for unlocking NFTs to users
    /// @dev accessible by Owner
    /// @param amount the amount to be updated as the new token limit
    /// @return true as execution status
    function setNFTUnlockTokenLimit(uint256 amount) external onlyOwner whenNotPaused returns (bool) {
        require(amount > 0, "Amount must be positive");

        nftUnlockTokenLimit = amount;

        emit NFTUnlockTokenLimitSet(amount, block.timestamp);

        return true;
    }

    // -------------------------------------------------------------
    /// @notice Admin set token limit for unlocking NFT related services to users
    /// @dev accessible by Owner
    /// @param amount the amount to be updated as the new token limit
    /// @return true as execution status
    function setNFTServTokenLimit(uint256 amount) external onlyOwner whenNotPaused returns (bool) {
        require(amount > 0, "Amount must be positive");

        nftServTokenLimit = amount;

        emit NFTServTokenLimitSet(amount, block.timestamp);

        return true;
    }

    // -------------------------------------------------------------
    /// @notice Admin set token limit for accessing DAO to users
    /// @dev accessible by Owner
    /// @param amount the amount to be updated as the new token limit
    /// @return true as execution status
    function setDAOTokenLimit(uint256 amount) external onlyOwner whenNotPaused returns (bool) {
        require(amount > 0, "Amount must be positive");

        daoTokenLimit = amount;

        emit DAOTokenLimitSet(amount, block.timestamp);

        return true;
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
        require(balances[account][timestamp] != 0, "No staking done for this account at parsed timestamp");
        require(timestamp > 0 && timestamp > block.timestamp, "Invalid timestamp");

        return balances[account][timestamp];
    }

    // -------------------------------------------------------------
    /// @notice Anyone can view total staked amount of a user till this timestamp
    /// @dev no permission required
    /// @param account account for which total staked amount by timestamp is asked for
    /// @param timestamp timestamp by which total staked amount is returned
    /// @return total staked amount till timestamp
/*    function getStakedTotAmtTillTstamp(address account, uint256 timestamp) public view returns (uint256) {
        require(account != address(0), "Invalid address");
        require(totalBalances[account] != 0, "No staking done for this account");
        require(balances[account][timestamp].stakedAmtTotYet != 0, "No staking done for this account till this timestamp");
        require(timestamp > 0 && timestamp > block.timestamp, "Invalid timestamp");

        return balances[account][timestamp].stakedAmtTotYet;
    }
*/
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
    /// @notice Get last stake timestamp for a user
    /// @param account account for which total staked amount is asked for
    /// @return the last timestamp
    function getLastTstamp(address account) public view returns (uint256) {
        require(account != address(0), "Invalid address");
        require(totalBalances[account] != 0, "No staking done for this account");
        
        return userTimestamps[account][userTimestamps[account].length-1];
    }

    // -------------------------------------------------------------
    /// @notice View User's status of eliqibility for getting access to platform features
    /// @dev viewable by anyone
    /// @param account user's address
    /// @return 0-> not staking for min. duration, 1-> NFT unlock, 2-> NFT services, 3-> DAO
    function getUserStatus(address account) external view returns (uint256) {
        require(account != address(0), "Invalid address");
        require(totalBalances[account] != 0, "No staking done for this account");

        uint256 stakedAmountTot = 0;
        uint256[] memory usrTstamps = userTimestamps[account];

        // sum the staked amounts if 1 month is elapsed
        for (uint256 i = 0; i < usrTstamps.length; ++i) {
            if( (block.timestamp.sub(usrTstamps[i]) >= STAKE_DURATION) &&
                (balances[account][usrTstamps[i]] != 0) ) 
            {
                stakedAmountTot = stakedAmountTot.add(balances[account][usrTstamps[i]]);

                // if total staked amount is more than greatest of all limits
                // , break out of the for-loop
                if( stakedAmountTot >= _greatestOf(nftUnlockTokenLimit, nftServTokenLimit, daoTokenLimit) )
                    break;
            }
        }

        if (stakedAmountTot >= daoTokenLimit) {
            // console.log("daoTokenLimit entry");
            return 3;
        }
        else if (stakedAmountTot >= nftServTokenLimit) {
            // console.log("nftServTokenLimit entry");
            return 2;
        }
        else if (stakedAmountTot >= nftUnlockTokenLimit) {
            // console.log("nftUnlockTokenLimit entry");
            return 1;
        }
        else {
            // console.log("No unlock entry");
            return 0;
        }
    }

    // ------------------------------------------------------------------------------------------
    /// @notice Pause contract 
    function pause() public onlyOwner whenNotPaused {
        _pause();
    }

    /// @notice Unpause contract
    function unpause() public onlyOwner whenPaused {
        _unpause();
    }

    // -------------UTILITY---------------------------------------------------------------------
    /// @notice Get index of element in array
    /// @param arr array from which the index of an element is to be found
    /// @param elem item to be searched in the array
    /// @return found status & index of element
    function _getArrIdx(uint256[] memory arr, uint256 elem) private pure returns (bool, uint256) {
        bool found = false;
        uint256 idx = 0;

        for (uint256 i = 0; i < arr.length; ++i) {
            if (arr[i] == elem) {
                found = true;
                idx = i;
                break;
            }
        }

        return (found, idx);
    }

    // ------------------------------------------------------------------------------------------
    /// @notice remove element (by index) from array
    /// @param arr array from where the item to be removed by index
    /// @param index the element of which is to be removed from the array
    function _removebyIndex(uint256[] storage arr, uint256 index) private {
        // M-1
        // delete arr[index];         // consumes 5000 gas. So, it's not recommended.
        
        require(index >= 0 && index < arr.length, "Invalid index at removebyIndex()");
        
        // M-2
        for(uint256 i = index; i < arr.length-1; ++i) {
            arr[i] = arr[i+1];
        }
        
        arr.pop();     // reduce the array length for v0.6+
    }

    function _greatestOf(uint256 num1, uint256 num2, uint256 num3) private pure returns (uint256) {
        if(num1 > num2 && num1 > num3) return num1;
        else if (num2 > num1 && num2 > num3) return num2;
        else return num3;
    }
}
