# Unit Test Mocks

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../../CREDITS.md).

Shared Jest mocks live here when multiple tests need the same browser, wallet,
or network shim. Keep one-off mocks next to the test that uses them.

- `browser.ts` installs deterministic `matchMedia` and `ResizeObserver` shims
  for jsdom tests.
