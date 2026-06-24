# Native Analytics Kernels

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

This directory contains optional low-level kernels for Phase 6 native analytics
experiments. TrustLedger still prefers Rust for memory-safe production services;
these C, C++, and assembly files exist for measured bottlenecks, whitepaper
analysis, and future WebAssembly/native-addon prototypes.

The native code is not required at runtime by the Next.js app. The checker
compiles representative files into project-local `tmp/native-check/` and leaves
shipping bundles untouched.

## Files

- `include/trustledger_native.h` — shared C ABI declarations.
- `c/tl_hash.c` — C routines for deterministic wallet-safe hash/risk scoring.
- `cpp/tl_metrics.cpp` — C++ routines for aggregate escrow metrics.
- `asm/tl_mix64_x86_64.S` — x86_64 assembly mixing routine.
- `asm/tl_mix64_arm64.S` — arm64 assembly mixing routine for Apple Silicon and
  Linux arm64.

## Commands

```sh
npm run native:check
```

The command uses `clang` and `clang++` when available. On macOS, Xcode Command
Line Tools provide both. On Linux CI, the default Ubuntu toolchain provides the
same commands.
