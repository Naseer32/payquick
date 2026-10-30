// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PaymentTrackerTestBase} from "./PaymentTracker.Base.t.sol";
import {PaymentTracker} from "../PaymentTracker.sol";
import {Test} from "forge-std/Test.sol";
import {VmSafe} from "forge-std/Vm.sol";

/// @dev Handler drives random valid sendPayment calls.
contract PaymentTrackerHandler is Test {
    PaymentTracker public tracker;

    /// @dev Track every paymentId emitted so the invariant can check monotonicity.
    uint256 public lastObservedId;
    uint256 public totalCalls;

    // Known EOA payers
    address internal payer1 = makeAddr("payer1");
    address internal payer2 = makeAddr("payer2");
    // Known payees (plain EOAs → always accept ETH)
    address internal payee1 = makeAddr("payee1");
    address internal payee2 = makeAddr("payee2");

    constructor(PaymentTracker _tracker) {
        tracker = _tracker;
        vm.deal(payer1, 1_000 ether);
        vm.deal(payer2, 1_000 ether);
    }

    /// @dev Issue a valid payment; record the id in the emitted event via vm.recordLogs.
    function sendPayment(uint96 rawAmount, uint8 payerSeed, uint8 payeeSeed) external {
        uint256 amount = bound(uint256(rawAmount), 1 wei, 1 ether);

        address payer = payerSeed % 2 == 0 ? payer1 : payer2;
        address payee = payeeSeed % 2 == 0 ? payee1 : payee2;

        vm.recordLogs();
        vm.prank(payer);
        tracker.sendPayment{value: amount}(payee, "inv-test");

        // Parse the emitted PaymentSent event to capture paymentId
        VmSafe.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i = 0; i < logs.length; i++) {
            // PaymentSent topic[0] == keccak256("PaymentSent(uint256,address,address,uint256,string,uint256)")
            if (logs[i].topics.length >= 2 &&
                logs[i].topics[0] == PaymentTracker.PaymentSent.selector) {
                uint256 emittedId = uint256(logs[i].topics[1]);
                // Invariant: emitted id must be strictly greater than last observed
                require(emittedId > lastObservedId, "INVARIANT: paymentId did not increase");
                lastObservedId = emittedId;
            }
        }
        totalCalls++;
    }
}

contract PaymentTrackerInvariantTest is PaymentTrackerTestBase {
    PaymentTrackerHandler internal handler;

    function setUp() public override {
        super.setUp();
        handler = new PaymentTrackerHandler(tracker);
        // Only drive calls through the handler
        targetContract(address(handler));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Invariants
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev paymentId is strictly monotonically increasing across all calls.
    ///      The handler itself enforces strict increase; this invariant adds a
    ///      belt-and-suspenders check: lastObservedId == totalCalls after N calls.
    function invariant_PaymentIdEqualsCallCount() external view {
        assertEq(
            handler.lastObservedId(),
            handler.totalCalls(),
            "paymentId must equal total successful payment count"
        );
    }

    /// @dev The tracker must never hold ETH — everything forwarded immediately.
    function invariant_TrackerBalanceAlwaysZero() external view {
        assertEq(address(tracker).balance, 0, "tracker must not retain ETH");
    }
}
