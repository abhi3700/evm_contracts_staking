## Unit Tests

### Test Cases
1. Stake
	1.1 Fails on parsing wrong token address
	1.2 Fails on parsing negative amount quantity
	1.3 Fails if token amount not approved by the staker
	1.4 Success & emits event

2. Set NFT Unlock Token limit
	2.1 Fails on parsing negative amount quantity
	2.2 Success & emits event

3. Set NFT Service Token limit
	3.1 Fails on parsing negative amount quantity
	3.2 Success & emits event

4. Set DAO Token limit
	4.1 Fails on parsing negative amount quantity
	4.2 Success & emits event

5. Get Staked amount by timestamp
	5.1 Fails if account address is zero
	5.2 Fails if no staking done
	5.3 Fails if negative array index parsed
	5.4 Fails if array index is more than the available index
	5.5 Stake amount & verify amount at parsed index

6. Get total staked amount
	6.1 Fails if account address is zero
	6.2 Fails if no staking done
	6.3 Stake amount & verify total amount

7. Get total staked amount
