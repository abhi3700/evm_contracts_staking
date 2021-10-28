//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import '@openzeppelin/contracts/utils/Context.sol';

import "hardhat/console.sol";

contract Token is ERC20, Ownable {
    address public admin;

    constructor() ERC20("Prezrv Token", "PREZRV") {
        _mint(_msgSender(), 1_000_000 * (10 ** uint256(decimals())));
        admin = _msgSender();
    }

    /**
     * @notice Mints given amount of tokens to recipient
     * @dev only owner can call this mint function
     * @param recipient address of account to receive the tokens
     * @param amount amount of tokens to mint
     */
    function mint(address recipient, uint256 amount) external onlyOwner {
        require(amount != 0, "amount == 0");
        _mint(recipient, amount);
    }

}