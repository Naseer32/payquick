// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PaymentTrackerTestBase} from "./PaymentTracker.Base.t.sol";
import {PaymentTracker} from "../PaymentTracker.sol";

contract PaymentTrackerUnitTest is PaymentTrackerTestBase {

    // ─────────────────────────────────────────────────────────────────────────
    // Deployment & initialisation
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Contract should have zero ETH balance after construction.
    function test_Deploy_ZeroBalance() public view {
        assertEq(address(tracker).balance, 0);
    }

    /// @dev The first payment emitted must carry paymentId == 1.
    ///      (Implicitly verifies _nextPaymentId starts at 1.)
    function test_Deploy_FirstPaymentIdIsOne() public {
        vm.expectEmit(true, true, true, false, address(tracker));
        emit PaymentTracker.PaymentSent(1, alice, bob, ONE_ETH, SAMPLE_MEMO, block.timestamp);

        vm.prank(alice);
        tracker.sendPayment{value: ONE_ETH}(bob, SAMPLE_MEMO);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Happy path – sendPayment
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev ETH must be forwarded in full to the recipient.
    function test_SendPayment_ForwardsFullValueToRecipient() public {
        uint256 before = bob.balance;

        vm.prank(alice);
        tracker.sendPayment{value: ONE_ETH}(bob, SAMPLE_MEMO);

        assertEq(bob.balance - before, ONE_ETH);
    }

    /// @dev Tracker contract must not retain any ETH after the call.
    function test_SendPayment_TrackerBalanceStaysZero() public {
        vm.prank(alice);
        tracker.sendPayment{value: ONE_ETH}(bob, SAMPLE_MEMO);

        assertEq(address(tracker).balance, 0);
    }

    /// @dev paymentId in the event must equal 1 for the first call.
    function test_SendPayment_EmitsPaymentIdOne() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, false, address(tracker));
        emit PaymentTracker.PaymentSent(1, alice, bob, ONE_ETH, SAMPLE_MEMO, block.timestamp);
        tracker.sendPayment{value: ONE_ETH}(bob, SAMPLE_MEMO);
    }

    /// @dev Full event field check: paymentId, sender, recipient, amount, memo, timestamp.
    function test_SendPayment_EventAllFields() public {
        uint256 ts = block.timestamp;

        vm.prank(alice);
        // All three indexed topics + all data fields
        vm.expectEmit(true, true, true, true, address(tracker));
        emit PaymentTracker.PaymentSent(1, alice, bob, ONE_ETH, SAMPLE_MEMO, ts);
        tracker.sendPayment{value: ONE_ETH}(bob, SAMPLE_MEMO);
    }

    /// @dev timestamp in the event must equal block.timestamp at the time of the call.
    function test_SendPayment_EventTimestampEqualsBlockTimestamp() public {
        uint256 warpTo = 1_700_000_000;
        vm.warp(warpTo);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true, address(tracker));
        emit PaymentTracker.PaymentSent(1, alice, bob, ONE_ETH, SAMPLE_MEMO, warpTo);
        tracker.sendPayment{value: ONE_ETH}(bob, SAMPLE_MEMO);
    }

    /// @dev Memo string content must be preserved verbatim in the event.
    function test_SendPayment_EventMemoPreserved() public {
        string memory memo = "hello world";

        vm.prank(alice);
        vm.expectEmit(true, true, true, true, address(tracker));
        emit PaymentTracker.PaymentSent(1, alice, bob, ONE_ETH, memo, block.timestamp);
        tracker.sendPayment{value: ONE_ETH}(bob, memo);
    }

    /// @dev Empty memo is valid and preserved.
    function test_SendPayment_EmptyMemoIsValid() public {
        vm.prank(alice);
        vm.expectEmit(true, true, true, true, address(tracker));
        emit PaymentTracker.PaymentSent(1, alice, bob, ONE_ETH, EMPTY_MEMO, block.timestamp);
        tracker.sendPayment{value: ONE_ETH}(bob, EMPTY_MEMO);
    }

    /// @dev paymentId increments: second call emits paymentId == 2.
    function test_SendPayment_PaymentIdIncrementsOnSecondCall() public {
        vm.prank(alice);
        tracker.sendPayment{value: ONE_WEI}(bob, EMPTY_MEMO);

        vm.prank(alice);
        vm.expectEmit(true, true, true, false, address(tracker));
        emit PaymentTracker.PaymentSent(2, alice, bob, ONE_WEI, EMPTY_MEMO, block.timestamp);
        tracker.sendPayment{value: ONE_WEI}(bob, EMPTY_MEMO);
    }

    /// @dev After two calls paymentId is at 3 (i.e. the counter reached 3).
    function test_SendPayment_ThirdCallEmitsPaymentIdThree() public {
        vm.startPrank(alice);
        tracker.sendPayment{value: ONE_WEI}(bob, EMPTY_MEMO);
        tracker.sendPayment{value: ONE_WEI}(bob, EMPTY_MEMO);

        vm.expectEmit(true, false, false, false, address(tracker));
        emit PaymentTracker.PaymentSent(3, alice, bob, ONE_WEI, EMPTY_MEMO, block.timestamp);
        tracker.sendPayment{value: ONE_WEI}(bob, EMPTY_MEMO);
        vm.stopPrank();
    }

    /// @dev Single-wei payment must still forward correctly.
    function test_SendPayment_OneWeiForwardedCorrectly() public {
        uint256 before = bob.balance;

        vm.prank(alice);
        tracker.sendPayment{value: ONE_WEI}(bob, EMPTY_MEMO);

        assertEq(bob.balance - before, ONE_WEI);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Revert paths – sendPayment
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev msg.value == 0 must revert with ZeroAmount.
    function test_Revert_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(PaymentTracker.ZeroAmount.selector);
        tracker.sendPayment{value: 0}(bob, SAMPLE_MEMO);
    }

    /// @dev to == address(0) must revert with ZeroRecipient.
    function test_Revert_ZeroRecipient() public {
        vm.prank(alice);
        vm.expectRevert(PaymentTracker.ZeroRecipient.selector);
        tracker.sendPayment{value: ONE_ETH}(address(0), SAMPLE_MEMO);
    }

    /// @dev to == address(tracker) must revert with SelfPaymentNotAllowed.
    function test_Revert_SelfPayment() public {
        vm.prank(alice);
        vm.expectRevert(PaymentTracker.SelfPaymentNotAllowed.selector);
        tracker.sendPayment{value: ONE_ETH}(address(tracker), SAMPLE_MEMO);
    }

    /// @dev Sending ETH via low-level transfer to tracker.receive() must revert.
    function test_Revert_DirectEthSend() public {
        vm.prank(alice);
        vm.expectRevert(PaymentTracker.DirectPaymentsNotSupported.selector);
        (bool success, ) = address(tracker).call{value: ONE_ETH}("");
        // vm.expectRevert causes the outer call to be the one being checked;
        // but with a low-level call we need to assert success == false explicitly
        // when expectRevert is NOT the right tool. Rewrite as vm.expectRevert approach:
        // (The vm.expectRevert above already handles the assertion.)
        (success); // silence unused-var warning; success is false, expectRevert handles it
    }

    /// @dev Ensure the tracker doesn't hold ETH even after a forwarding failure path.
    ///      If the recipient is a contract that rejects ETH, sendPayment must revert
    ///      with ForwardFailed and the tracker must not hold the funds.
    function test_Revert_ForwardFailed_RejectingRecipient() public {
        // Deploy a contract that cannot receive ETH (no receive/fallback)
        NonPayable rejecter = new NonPayable();

        vm.prank(alice);
        vm.expectRevert(PaymentTracker.ForwardFailed.selector);
        tracker.sendPayment{value: ONE_ETH}(address(rejecter), SAMPLE_MEMO);

        // Tracker should still hold zero ETH
        assertEq(address(tracker).balance, 0);
    }
}

/// @dev A contract that cannot receive ETH — used to trigger ForwardFailed.
contract NonPayable {
    // No receive() or fallback() → rejects all ETH sends
}
