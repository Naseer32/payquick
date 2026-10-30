// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PaymentTracker
/// @notice Permissionless payment router and receipt logger for native Arc USDC payments.
contract PaymentTracker is ReentrancyGuard {
    /// @notice Emitted when a payment is forwarded to a merchant and recorded on-chain.
    /// @dev Signature pre-image: PaymentSent(uint256,address,address,uint256,string,uint256)
    ///      keccak256(pre-image) =
    ///      0x3850c91f104feb2bf70644e43b04de7b6368673d810ad84a914bfc9aefb270ea
    event PaymentSent(
        uint256 indexed paymentId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        string memo,
        uint256 timestamp
    );

    error ZeroAmount();
    error ZeroRecipient();
    error SelfPaymentNotAllowed();
    error ForwardFailed();
    error DirectPaymentsNotSupported();

    uint256 private _nextPaymentId = 1;

    /// @notice Forwards native USDC payment to a merchant and emits a verifiable receipt event.
    /// @param to Merchant wallet receiving funds.
    /// @param memo Arbitrary payment memo (backend may validate invoice suffix formatting).
    function sendPayment(address to, string calldata memo) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroRecipient();
        if (to == address(this)) revert SelfPaymentNotAllowed();

        uint256 paymentId = _nextPaymentId;
        unchecked {
            _nextPaymentId = paymentId + 1;
        }

        (bool success, ) = to.call{value: msg.value}("");
        if (!success) revert ForwardFailed();

        emit PaymentSent(paymentId, msg.sender, to, msg.value, memo, block.timestamp);
    }

    /// @notice Rejects direct transfers; payments must go through sendPayment.
    receive() external payable {
        revert DirectPaymentsNotSupported();
    }
}
