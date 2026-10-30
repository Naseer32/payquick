// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PaymentTrackerTestBase} from "./PaymentTracker.Base.t.sol";
import {PaymentTracker} from "../PaymentTracker.sol";
import {MaliciousReceiver} from "../test-helpers/MaliciousReceiver.sol";

contract PaymentTrackerReentrancyTest is PaymentTrackerTestBase {

    MaliciousReceiver internal attacker;

    function setUp() public override {
        super.setUp();
        // Deploy attacker with charlie as the ultimate funds target
        attacker = new MaliciousReceiver(tracker, charlie);
        // Fund the attacker so it can attempt a re-entry payment (1 wei)
        attacker.fund{value: 1 wei}();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reentrancy guard
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev The re-entry attempt inside receive() must fail.
    ///      The outer sendPayment call itself reverts because the inner
    ///      call to the malicious receiver propagates the revert upward,
    ///      causing ForwardFailed to bubble up.
    ///
    ///      Behaviour with nonReentrant + call forwarding:
    ///      1. alice calls sendPayment → reentrancy guard locks
    ///      2. tracker.call{value}(attacker) → attacker.receive() fires
    ///      3. attacker tries tracker.sendPayment again → guard fires ReentrancyGuardReentrantCall
    ///      4. try/catch in attacker catches it → reentrySucceeded = false
    ///      5. attacker.receive() returns normally → outer call succeeds
    ///      6. We verify reentryAttempted == true and reentrySucceeded == false
    function test_Reentrancy_GuardPreventsReentry() public {
        uint256 payment = 1 ether;
        vm.deal(alice, payment);

        // The outer call should SUCCEED because the attacker's receive() catches the
        // inner revert.  What matters is that re-entry is blocked.
        vm.prank(alice);
        tracker.sendPayment{value: payment}(address(attacker), "first");

        assertTrue(attacker.reentryAttempted(),  "re-entry was never attempted");
        assertFalse(attacker.reentrySucceeded(), "re-entry should have been blocked by nonReentrant");
    }

    /// @dev When re-entry is blocked the original payment STILL completes:
    ///      the attacker receives the original amount, charlie gets nothing.
    function test_Reentrancy_OriginalPaymentCompletesWhenReentryBlocked() public {
        uint256 payment = 1 ether;
        vm.deal(alice, payment);

        uint256 attackerBefore = address(attacker).balance; // already has 1 wei
        uint256 charlieBefore  = charlie.balance;

        vm.prank(alice);
        tracker.sendPayment{value: payment}(address(attacker), "first");

        // Attacker received the original 1 ETH
        assertEq(address(attacker).balance - attackerBefore, payment,
            "attacker did not receive original payment");
        // Charlie received nothing (re-entry failed)
        assertEq(charlie.balance, charlieBefore,
            "charlie should not have received anything from re-entry");
    }
}
