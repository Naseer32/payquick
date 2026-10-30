// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PaymentTrackerTestBase} from "./PaymentTracker.Base.t.sol";
import {PaymentTracker} from "../PaymentTracker.sol";

contract PaymentTrackerFuzzTest is PaymentTrackerTestBase {

    // ─────────────────────────────────────────────────────────────────────────
    // Fuzz: amount forwarding exactness
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev For any nonzero uint96 amount, the recipient balance delta must
    ///      exactly equal msg.value — no dust, no rounding.
    function testFuzz_SendPayment_ForwardingIsExact(uint96 rawAmount) public {
        // Use uint96 to stay well within alice's 100 ether (< 2^96 wei ≈ 79 billion ETH)
        uint256 amount = bound(uint256(rawAmount), 1, 100 ether);

        vm.deal(alice, amount); // give alice exactly the right amount
        uint256 before = bob.balance;

        vm.prank(alice);
        tracker.sendPayment{value: amount}(bob, SAMPLE_MEMO);

        assertEq(bob.balance - before, amount, "recipient delta != msg.value");
        assertEq(address(tracker).balance, 0,  "tracker retained ETH");
    }

    /// @dev Fuzz memo: any string content is accepted; event preserves it exactly.
    function testFuzz_SendPayment_ArbitraryMemoAccepted(
        uint96 rawAmount,
        string calldata memo
    ) public {
        uint256 amount = bound(uint256(rawAmount), 1, 100 ether);
        vm.deal(alice, amount);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true, address(tracker));
        emit PaymentTracker.PaymentSent(1, alice, bob, amount, memo, block.timestamp);
        tracker.sendPayment{value: amount}(bob, memo);
    }

    /// @dev Fuzz paymentId: after N calls (1..50) the next event carries id N.
    function testFuzz_SendPayment_PaymentIdSequential(uint8 n) public {
        // Keep n in [1, 50] to avoid excessive gas usage
        uint256 count = bound(uint256(n), 1, 50);

        for (uint256 i = 1; i < count; i++) {
            vm.deal(alice, 1 wei);
            vm.prank(alice);
            tracker.sendPayment{value: 1 wei}(bob, EMPTY_MEMO);
        }

        // The next call must produce paymentId == count
        vm.deal(alice, 1 wei);
        vm.prank(alice);
        vm.expectEmit(true, false, false, false, address(tracker));
        emit PaymentTracker.PaymentSent(count, alice, bob, 1 wei, EMPTY_MEMO, block.timestamp);
        tracker.sendPayment{value: 1 wei}(bob, EMPTY_MEMO);
    }

    /// @dev ZeroAmount reverts for any non-zero recipient.
    function testFuzz_Revert_ZeroAmountAnyRecipient(address recipient) public {
        // Skip zero address and tracker address — those have their own revert reasons
        vm.assume(recipient != address(0));
        vm.assume(recipient != address(tracker));

        vm.prank(alice);
        vm.expectRevert(PaymentTracker.ZeroAmount.selector);
        tracker.sendPayment{value: 0}(recipient, SAMPLE_MEMO);
    }

    /// @dev For any nonzero amount, sending to address(tracker) always reverts.
    function testFuzz_Revert_SelfPaymentAnyAmount(uint96 rawAmount) public {
        uint256 amount = bound(uint256(rawAmount), 1, 100 ether);
        vm.deal(alice, amount);

        vm.prank(alice);
        vm.expectRevert(PaymentTracker.SelfPaymentNotAllowed.selector);
        tracker.sendPayment{value: amount}(address(tracker), SAMPLE_MEMO);
    }
}
