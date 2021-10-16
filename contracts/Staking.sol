// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';

/**
 * @notice A Staking contract for PREZRV
 */
contract Staking is Ownable, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ==========State variables====================================
    IERC20 public stakingToken;

    // Stake type for balances variable
    struct Stake {
        uint256 amount;
        uint256 stakeTimestamp;
    }
    mapping (address => Stake[]) public balances;

    // ==========Events=============================================
    event TokenStaked(address indexed staker, uint256 indexed amount, uint256 indexed stakeTimestamp);
    event StakingTransferFromFailed(address indexed staker, uint256 indexed amount);

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
    function stake(IERC20 _token, uint256 _amount) external payable whenNotPaused {
        require(_token != stakingToken, "Invalid token");)
        require( _amount > 0, "amount must be positive");

        Stake memory newStaking = Stake(_amount, block.timestamp);
        balances[msg.sender].push(newStaking);

        // transfer to SC using delegate transfer
        // NOTE: the tokens has to be approved first by the caller to the SC using `approve()` method.
        bool success = stakingToken.transferFrom(msg.sender, address(this), _amount);
        if(success) {
            emit TokenStaked(msg.sender, _amount, block.timestamp);
        } else {
            emit StakingTransferFromFailed(msg.sender, _amount);
            revert("stakingToken.transferFrom function failed");
        }
    }

    // -------------------------------------------------------------
    /// @notice Anyone can view staked amount of a user by index
    /// @dev no permission required
    /// @param account account for which staked amount by index is asked for
    /// @param arrayIndex the index of the balances value array
    function getStakedAmtIdx(address account, uint256 arrayIndex) public view returns (uint256) {
        require(account != address(0), "Invalid address");
        require(balances[account].length > 0, "No staking done by this account");
        require( (arrayIndex > 0) && (arrayIndex <= balances[account].length.sub(1)), "index must be within balances index");

        return balances[account][arrayIndex].amount;
    }

    // -------------------------------------------------------------
    /// @notice Anyone can view total staked amount of a user
    /// @dev no permission required
    /// @param account account for which total staked amount is asked for
    function getStakedAmtTot(address account) public view returns (uint256) {
        require(account != address(0), "Invalid address");
        require(balances[account].length > 0, "No staking done by this account");

        uint256 sum = 0;

        for(uint256 i = 0; i < balances[account].length; ++i) {
            sum = sum.add(balances[account].amount);
        }

        return sum;
    }


}
