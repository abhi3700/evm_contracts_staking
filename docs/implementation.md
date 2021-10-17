## Implementation

### Deployment
* Deploy the `Staking` contract.

### SC System Design
#### State Variables
* `balances` of type `mapping` has:
	- key: `address`
	- value: array of `Stake` where,
		+ `Stake` is a struct of attributes:
			- `amount` of type: `uint256`
			- `stakeTimestamp` of type: `uint256`

#### Constructor
* set the PREZRV `token` contract address.
* set the deployer as admin, which can be viewed using `owner()` function (inherited from `Ownable`).

#### Functions
* `stake` has params:
	- `token` of type `IERC20`
	- `amount` of type `uint256`
* `getStakedAmtIdx` has params:
	- `account` of type `address`
	- `arrayIndex` of type `uint256`
* `getStakedAmtTot` has params:
	- `account` of type `address`

#### Events
* `TokenStaked` has params:
	- `staker`
	- `amount`
	- `stakeTimestamp`
* `StakingTransferFromFailed` has params:
	- `staker`
	- `amount`
