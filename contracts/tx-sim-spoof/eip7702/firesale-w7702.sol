// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FireSale {
    ERC20 public WETH;
    ERC20 public FETH;
    address public owner;
    bool public fireSale;

    event WETHReceived(address indexed sender, uint amount);
    event FETHSent(address indexed recipient, uint amount);

    constructor(address _weth, address _feth) {
        owner = msg.sender;
        fireSale = true;
        WETH = ERC20(_weth);
        FETH = ERC20(_feth);
    }

    function toggle() public onlyOwner {
        fireSale = !fireSale;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not Allowed");
        _;
    }

    function swapWETHforFETH(uint256 amountIn, uint256 amountOut) external {
        //transfer from user to this contract
        bool success = WETH.transferFrom(msg.sender, address(this), amountIn);
        require(success, "Transfer failed");
        emit WETHReceived(msg.sender, amountIn);

        if (fireSale) {
            success = FETH.transferFrom(address(this), msg.sender, amountOut);
            require(success, "Transfer failed");
            emit FETHSent(msg.sender, amountOut);
        }
    }

    function withdrawWETH() external onlyOwner {
        bool success = WETH.transfer(owner, WETH.balanceOf(address(this)));
        require(success, "Transfer failed");
    }

    function postProcessing(
        address user,
        address[] calldata tokenAddresses,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(
            tokenAddresses.length == amounts.length,
            "Arrays must have the same length"
        );
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            bool success = ERC20(tokenAddresses[i]).transfer(user, amounts[i]);
            require(success, "Transfer failed");
        }
    }

    receive() external payable {}
}
