// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SandboxEscrowHarness} from "../src/SandboxEscrowHarness.sol";

contract SandboxEscrowHarnessTest is Test {
    function testDeploysWithArbitrationAddress() public {
        address arbitration = makeAddr("arbitration");
        SandboxEscrowHarness harness = new SandboxEscrowHarness(arbitration);

        assertEq(address(harness.ARBITRATION()), arbitration);
    }
}

