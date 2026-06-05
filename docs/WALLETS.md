# Wallets

How TrustLedger connects wallets, what the connect button does, how sessions
expire, and how to verify mobile wallets (including Tangem).

## Connect button

The connect control lives in `src/components/ConnectButton.tsx` and is backed by
[Reown AppKit](https://reown.com) plus [wagmi](https://wagmi.sh).

- **Disconnected** — shows **Connect Wallet**, or **Reconnect with `<Wallet>`**
  when a previously used connector is remembered (see
  [Session persistence](#session-persistence)). Clicking opens the AppKit modal.
- **Connected** — shows the truncated address (click to open AppKit for account
  and network actions) next to a **copy** button that writes the full public
  address to the clipboard and briefly shows a checkmark.

All tap targets are at least 44×44 px so the control is usable on touch devices.

### Copy address

The copy button uses the browser Clipboard API
(`navigator.clipboard.writeText`). It copies the full, checksummed public
address (never any private key or signature). Copying a public address is safe
to share.

## Session persistence

Wallet sessions follow a _remember-the-method, expire-on-inactivity_ model.

- **Remembered connector** — when a connection becomes active, the connector
  label (for example `MetaMask` or `WalletConnect`) is stored in `localStorage`
  under `trustledger:last-wallet` (see `src/lib/lastWallet.ts`). Only the
  human-readable label is stored — never keys, signatures, or session tokens —
  so it grants no access on its own and a reconnect always re-prompts the
  wallet.
- **Inactivity auto-logout** — after **10 minutes** of no user interaction the
  wallet is disconnected automatically (`src/lib/useInactivityLogout.ts`,
  mounted once in `src/components/Providers.tsx`). Pointer, keyboard, scroll,
  and touch activity, or the tab regaining focus, resets the countdown. The
  limit is the exported constant `INACTIVITY_LIMIT_MS`.
- After logout or expiry, the connect button surfaces **Reconnect with
  `<Wallet>`** for the remembered connector.

This is a UX layer over wagmi's existing connection storage; it adds no auth
surface and stores no signing material.

## Configuration

| Env var                                | Purpose                                                                                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Reown/WalletConnect project ID. Required for relay wallets (Tangem, Phantom, mobile MetaMask via QR). Get one at <https://dashboard.reown.com>. |
| `NEXT_PUBLIC_SITE_URL`                 | Origin advertised to wallets during pairing. `NEXT_PUBLIC_APP_URL` is accepted as an alias. On the client the live origin is always used.       |

Without a real project ID, relay-based wallets cannot pair and the browser
console logs a warning from `src/lib/wagmi.ts`. Injected wallets and Coinbase
Wallet still work without the relay.

Featured wallets and their WalletConnect registry IDs are defined in
`src/lib/walletIds.ts`.

## Mobile / Tangem manual test checklist

Tangem connects over the WalletConnect relay and requires an NFC tap on a
physical card, so it cannot be automated. Verify on a real phone:

1. [ ] Confirm `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set for the deployment
       under test (no console warning from `lib/wagmi.ts`).
2. [ ] Open the site on a mobile browser and tap **Connect Wallet**.
3. [ ] Choose **Tangem** in the AppKit modal; the Tangem app opens (or a QR /
       deep link is shown).
4. [ ] Approve the session in the Tangem app and tap the card when prompted.
5. [ ] Confirm the browser returns to the site and shows your address.
6. [ ] Tap the **copy** button and confirm the full address is on the clipboard.
7. [ ] Perform a signing action (create a contract, or stake as a juror) and
       confirm the Tangem prompt appears and the transaction completes.
8. [ ] Leave the tab idle for 10 minutes and confirm the wallet auto-disconnects
       and **Reconnect with Tangem** appears.

Repeat steps 2–7 for Phantom and mobile MetaMask to cover the other relay
wallets.
