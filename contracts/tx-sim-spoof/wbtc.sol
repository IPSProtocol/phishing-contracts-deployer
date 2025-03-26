// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WBTC is ERC20 {
    constructor() ERC20("WBTC", "WBTC") {
        _mint(msg.sender, 1000000000000000000000000);
    }
}
