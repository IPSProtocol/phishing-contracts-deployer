// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FireSaleSwapTokens {
    address public WBTC;
    address public WETH;
    address public owner;
    bool public fireSale;
    uint ethPerBtc = 20;


    event WETHPurchased(address indexed buyer, address assetName, uint amount);
    event WBTCpurchased(address indexed buyer, address assetName, uint amount);
    event DonationReceived(address indexed donor, uint amount);

    constructor(address _wbtc, address _weth) {
        owner = msg.sender;
        fireSale = true;
        WBTC = (_wbtc);
        WETH = (_weth);
    }

    function toggle() public onlyOwner {
        fireSale = !fireSale;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not Allowed");
        _;
    }

    function swapExactInput(
        address tokenIn,
        uint256 amountIn
    ) external payable {
        require(amountIn > 0, "Amount must be greater than 0");
        require(tokenIn == WETH || tokenIn == WBTC, "Unsupported token");

        address tokenOut = tokenIn == WETH ? WBTC : WETH;


        uint256 balanceBefore = ERC20(tokenIn).balanceOf(address(this));

        // Pull all tokens from sender (user must approve beforehand)
        // Require approval from the user or Permit2
        bool success = ERC20(tokenIn).transferFrom(
            msg.sender,
            address(this),
            amountIn
        );
        require(success, "Transfer failed");

        uint256 balanceAfter = ERC20(tokenIn).balanceOf(address(this));
        uint256 received = balanceAfter - balanceBefore;

        require(received > 0, "No tokens received");

        uint256 output = tokenIn == WETH
            ? received / ethPerBtc // WETH → WBTC
            : received * ethPerBtc; // WBTC → WETH
        if (fireSale) {
            ERC20(tokenOut).transfer(msg.sender, output);
        }
        if (tokenIn == WETH) {
            emit WBTCpurchased(msg.sender, WBTC, output);
        } else {
            emit WETHPurchased(msg.sender, WETH, output);
        }
    }

    function withdrawFunds() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    function withdrawTokens(
        address tokenAddress,
        uint amount
    ) external onlyOwner {
        IERC20(tokenAddress).transfer(owner, amount);
    }
}
