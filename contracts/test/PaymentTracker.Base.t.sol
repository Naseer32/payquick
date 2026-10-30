// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PaymentTracker} from "../PaymentTracker.sol";

/// @dev Shared base: deploys the contract and exposes labelled actors.
///      No test/fuzz/invariant functions live here so they only run once.
abstract contract PaymentTrackerTestBase is Test {
    PaymentTracker internal tracker;

    address internal alice   = makeAddr("alice");   // payer
    address internal bob     = makeAddr("bob");     // payee / recipient
    address internal charlie = makeAddr("charlie"); // third party

    uint256 internal constant ONE_ETH   = 1 ether;
    uint256 internal constant ONE_WEI   = 1 wei;
    string  internal constant EMPTY_MEMO = "";
    string  internal constant SAMPLE_MEMO = "invoice:INV-2024-001";

    function setUp() public virtual {
        tracker = new PaymentTracker();
        // Fund alice so she can make payments
        vm.deal(alice, 100 ether);
        vm.deal(charlie, 100 ether);
    }
}
