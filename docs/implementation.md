## Implementation

### Constructor
* set the PREZRV `token` contract address.
* set the deployer as `admin`.

### State Variables
* `balances`
	- type: `mapping`
	- key: `address`
	- value: `Stake`
		+ `Stake` is a struct of
			- `timestamp` of type: `uint256`
			- `amount` of type: `uint256`


### Functions
* `stake` has params:
	- `token` of type `IERC20`
	- `amount` of type `uint256`

### Events
* `TokenStaked` has params:
	- `staker`
	- `amount`
	- `stakeTimestamp`
* `StakingTransferFromFailed` has params:
	- `staker`
	- `amount`
