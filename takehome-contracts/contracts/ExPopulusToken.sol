// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ExPopulusToken is ERC20, Ownable, ERC20Permit {
    address public initialMinter;

    constructor(
        address _initialMinter
    ) ERC20("ExToken", "XTK") Ownable(_msgSender()) ERC20Permit("ExToken") {
        initialMinter = _initialMinter;
    }

    modifier onlyMinter() {
        require(
            owner() == _msgSender() || address(initialMinter) == _msgSender(),
            "Caller is not authorized"
        );
        _;
    }

    function mintToken(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
    }

    function setInitialMinter(address _initialMinter) public onlyOwner {
        initialMinter = _initialMinter;
    }
}
