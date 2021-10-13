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
    mapping (address => Stake) balances;

    // ==========Events=============================================
    event Staked(address indexed staker, uint256 indexed amount, uint256 indexed stakeTimestamp);

    // ==========Constructor========================================
    constructor(
        IERC20 _token
    ) {
        require(address(_token) != address(0), "Invalid address");
        
        stakingToken = _token;
    }

    // ==========Functions==========================================

}
