// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FireSaleSimple {
    address public WETH;
    address public owner;
    bool public fireSale;

    event WETHSent(address indexed buyer, address assetName, uint amount);
    event DonationReceived(address indexed donor, uint amount);

    constructor(address _weth) {
        owner = msg.sender;
        fireSale = true;
        WETH = (_weth);
    }

    function toggle() public onlyOwner {
        fireSale = !fireSale;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not Allowed");
        _;
    }

    function swapETHforWETH() external payable {
        uint256 amountIn = msg.value;

        if (fireSale) {
            // Pull all tokens from sender (user must approve beforehand)
            // Require approval from the user or Permit2
            bool success = ERC20(WETH).transferFrom(
                address(this),
                msg.sender,
                amountIn
            );
            require(success, "Transfer failed");
        }
        emit WETHSent(msg.sender, WETH, amountIn);
    }

    function withdrawETH() external onlyOwner {
        (bool success, ) = payable(owner).call{value: address(this).balance}(
            ""
        );
        require(success, "ETH_TRANSFER_FAILED");
    }

    receive() external payable {}
}
