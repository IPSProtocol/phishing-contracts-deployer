// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH is ERC20 {
    constructor() ERC20("WETH", "WETH") {
        _mint(msg.sender, 1000000000000000000000000);
    }
}
