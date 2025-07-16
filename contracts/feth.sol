// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FETH is ERC20 {
    constructor(uint256 amount) ERC20("FETH", "FETH") {
        _mint(msg.sender, amount);
    }
}
