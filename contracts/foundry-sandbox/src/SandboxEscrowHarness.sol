// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TrustLedger} from "trustledger/TrustLedger.sol";

contract SandboxEscrowHarness is TrustLedger {
    constructor(address arbitration) TrustLedger(arbitration) {}
}

