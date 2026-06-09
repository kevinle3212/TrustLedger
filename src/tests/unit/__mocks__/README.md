# Unit Test Mocks

Shared Jest mocks live here when multiple tests need the same browser, wallet,
or network shim. Keep one-off mocks next to the test that uses them.

- `browser.ts` installs deterministic `matchMedia` and `ResizeObserver` shims
  for jsdom tests.
