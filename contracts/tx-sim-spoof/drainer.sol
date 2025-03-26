// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Drainer {
    event Swap(address token, address to);
    function swap(address token, address to) external payable {
        emit Swap(token, to);
        IERC20(token).transfer(to, IERC20(token).balanceOf(address(this)));
    }
}