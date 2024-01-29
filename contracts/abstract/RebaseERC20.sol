// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "../interfaces/IDataFeed.sol";
import "../interfaces/IDataFeed.sol";
import "../access/WithMidasAccessControl.sol";
import "../access/Pausable.sol";

abstract contract RebaseERC20 is
    WithMidasAccessControl,
    Pausable,
    IERC20Upgradeable,
    IERC20MetadataUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint256 public constant DIVIDER = 1e18;

    address public priceFeed;

    address public underlyingToken;

    uint256 private _totalShares;

    mapping(address => uint256) private _shares;

    mapping(address => mapping(address => uint256)) private _allowances;

    event TransferShares(
        address indexed from,
        address indexed to,
        uint256 sharesAmount
    );

    constructor() {
        _disableInitializers();
    }

    function __RebaseERC20_init(
        address _ac,
        address _underlyingToken,
        address _priceFeed
    ) internal onlyInitializing {
        __Pausable_init(_ac);
        underlyingToken = _underlyingToken;
        priceFeed = _priceFeed;
    }

    function name() public pure virtual returns (string memory);

    function symbol() public pure virtual returns (string memory);

    function decimals() public pure virtual returns (uint8) {
        return 18;
    }

    function totalSupply() public view returns (uint256) {
        return getTokenAmount(_totalShares);
    }

    function totalShares() public view returns (uint256) {
        return _totalShares;
    }

    function balanceOf(address _account) public view returns (uint256) {
        return getTokenAmount(_shares[_account]);
    }

    function sharesOf(address _account) public view returns (uint256) {
        return _shares[_account];
    }

    function mint(address receiver, uint256 sharesAmount) external {
        IERC20Upgradeable(underlyingToken).safeTransferFrom(
            msg.sender,
            address(this),
            sharesAmount
        );

        _mint(receiver, sharesAmount);
    }

    function burn(uint256 tokenAmount) external {
        uint256 sharesBurned = _burn(msg.sender, tokenAmount);

        IERC20Upgradeable(underlyingToken).safeTransfer(
            msg.sender,
            sharesBurned
        );
    }

    function transfer(
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address owner = msg.sender;
        _transfer(owner, to, amount);
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(
        address spender,
        uint256 amount
    ) public virtual override returns (bool) {
        address owner = msg.sender;
        _approve(owner, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) public virtual returns (bool) {
        address owner = msg.sender;
        _approve(owner, spender, allowance(owner, spender) + addedValue);
        return true;
    }

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) public virtual returns (bool) {
        address owner = msg.sender;
        uint256 currentAllowance = allowance(owner, spender);
        require(
            currentAllowance >= subtractedValue,
            "ERC20: decreased allowance below zero"
        );
        unchecked {
            _approve(owner, spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    function _transfer(address from, address to, uint256 tokenAmount) internal {
        uint256 sharesAmount = getSharesAmount(tokenAmount);

        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(from, to, sharesAmount);

        uint256 fromShares = _shares[from];

        require(
            fromShares >= sharesAmount,
            "ERC20: transfer amount exceeds balance"
        );

        unchecked {
            _shares[from] = fromShares - sharesAmount;
            // Overflow not possible: the sum of all balances is capped by totalSupply, and the sum is preserved by
            // decrementing then incrementing.
            _shares[to] += sharesAmount;
        }

        emit Transfer(from, to, tokenAmount);
        emit TransferShares(from, to, sharesAmount);
    }

    function _mint(address account, uint256 sharesAmount) internal {
        require(sharesAmount > 0, "RERC20: amount is 0");

        uint256 utPrice = getUnderlyingTokenPrice();
        uint256 tokenAmount = (sharesAmount * utPrice) / DIVIDER;

        _beforeTokenTransfer(address(0), account, sharesAmount);

        _totalShares += sharesAmount;
        unchecked {
            // Overflow not possible: balance + amount is at most totalSupply + amount, which is checked above.
            _shares[account] += sharesAmount;
        }

        emit Transfer(address(0), account, tokenAmount);
        emit TransferShares(address(0), account, sharesAmount);
    }

    function _burn(
        address account,
        uint256 tokenAmount
    ) internal returns (uint256) {
        uint256 utPrice = getUnderlyingTokenPrice();
        uint256 sharesAmount = (tokenAmount * DIVIDER) / utPrice;

        require(sharesAmount > 0, "RERC20: amount is 0");

        _beforeTokenTransfer(account, address(0), sharesAmount);

        uint256 accountShares = _shares[account];
        require(
            accountShares >= sharesAmount,
            "ERC20: burn amount exceeds balance"
        );

        unchecked {
            _shares[account] = accountShares - sharesAmount;
            // Overflow not possible: amount <= accountBalance <= totalSupply.
            _totalShares -= sharesAmount;
        }

        emit Transfer(account, address(0), tokenAmount);
        emit TransferShares(account, address(0), sharesAmount);

        return sharesAmount;
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(
                currentAllowance >= amount,
                "ERC20: insufficient allowance"
            );
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256
    ) internal view {
        require(!paused(), "ERC20Pausable: token transfer while paused");
    }

    function getTokenAmount(
        uint256 _sharesAmount
    ) public view returns (uint256) {
        return (_sharesAmount * getUnderlyingTokenPrice()) / DIVIDER;
    }

    function pauseAdminRole() public view virtual override returns (bytes32) {
        return ST_USDR_ADMIN_ROLE;
    }

    function getSharesAmount(
        uint256 _tokenAmount
    ) public view returns (uint256) {
        return (_tokenAmount * DIVIDER) / getUnderlyingTokenPrice();
    }

    function getUnderlyingTokenPrice() public view returns (uint256) {
        return IDataFeed(priceFeed).getDataInBase18();
    }
}
