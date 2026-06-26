#![deny(missing_docs)]
//! Native Solana SOL staking program for TrustLedger.
//!
//! Minimal, deterministic SOL staking built on program-derived accounts (PDAs) without Anchor,
//! matching the native style of [`trustledger-solana-escrow`]. It custodies staked lamports in a
//! per-owner stake PDA and pays linear rewards from a pool reserve funded at initialization.
//!
//! Instructions:
//!   - `Initialize`    (0): create the singleton pool PDA, set the authority, reward rate, and
//!                          pre-fund the reward reserve.
//!   - `Stake`         (1): move lamports from the owner into their stake PDA, increasing balance.
//!   - `Unstake`       (2): return lamports from the stake PDA to the owner, decreasing balance.
//!   - `ClaimRewards`  (3): pay accrued rewards from the pool reserve to the owner.
//!
//! On-chain account validation, ownership, and signer checks are enforced in `process_instruction`;
//! the balance and reward math lives in small, pure functions that are unit-tested for determinism.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::{Sysvar, SysvarSerialize},
};
use solana_sdk_ids::system_program;
use solana_system_interface::instruction as system_instruction;

entrypoint!(process_instruction);

const INITIALIZE: u8 = 0;
const STAKE: u8 = 1;
const UNSTAKE: u8 = 2;
const CLAIM_REWARDS: u8 = 3;

const POOL_SEED: &[u8] = b"trustledger_stake_pool";
const STAKE_SEED: &[u8] = b"trustledger_stake";

const POOL_MAGIC: &[u8; 8] = b"TLSTKP01";
const STAKE_MAGIC: &[u8; 8] = b"TLSTKA01";
const STATE_VERSION: u8 = 1;

/// Fixed-point divisor for the reward rate: reward rate is "reward lamports per staked lamport per
/// second", scaled by this constant. A rate of `REWARD_SCALE` therefore pays 1 lamport per staked
/// lamport per second.
const REWARD_SCALE: u128 = 1_000_000_000_000;

/// Routes a raw instruction to its handler. See the module docs for the instruction set.
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let (&discriminator, rest) = instruction_data
        .split_first()
        .ok_or(ProgramError::InvalidInstructionData)?;

    match discriminator {
        INITIALIZE => process_initialize(program_id, accounts, rest),
        STAKE => process_stake(program_id, accounts, read_amount(rest)?),
        UNSTAKE => process_unstake(program_id, accounts, read_amount(rest)?),
        CLAIM_REWARDS => process_claim_rewards(program_id, accounts, rest),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

/// Reads a single trailing `u64` (little-endian) and rejects any extra bytes.
fn read_amount(data: &[u8]) -> Result<u64, ProgramError> {
    let bytes: [u8; 8] = data
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    Ok(u64::from_le_bytes(bytes))
}

/// Asserts the account signed the transaction.
fn require_signer(account: &AccountInfo) -> ProgramResult {
    if account.is_signer {
        Ok(())
    } else {
        Err(ProgramError::MissingRequiredSignature)
    }
}

/// Asserts the account is owned by this program (i.e. is one of our initialized PDAs).
fn require_program_owned(account: &AccountInfo, program_id: &Pubkey) -> ProgramResult {
    if account.owner == program_id {
        Ok(())
    } else {
        Err(ProgramError::IllegalOwner)
    }
}

/// Asserts the derived PDA for `seeds` matches `account` and returns the bump.
fn require_pda(
    account: &AccountInfo,
    seeds: &[&[u8]],
    program_id: &Pubkey,
) -> Result<u8, ProgramError> {
    let (expected, bump) = Pubkey::find_program_address(seeds, program_id);
    if expected == *account.key {
        Ok(bump)
    } else {
        Err(ProgramError::InvalidSeeds)
    }
}

// ─── Instruction handlers ──────────────────────────────────────────────────────

fn process_initialize(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let args = InitializeArgs::parse(data)?;

    let account_iter = &mut accounts.iter();
    let authority = next_account_info(account_iter)?;
    let pool = next_account_info(account_iter)?;
    let system_program_account = next_account_info(account_iter)?;
    let rent_sysvar = next_account_info(account_iter)?;

    require_signer(authority)?;
    if *system_program_account.key != system_program::id() {
        return Err(ProgramError::IncorrectProgramId);
    }
    let bump = require_pda(pool, &[POOL_SEED], program_id)?;
    if pool.data_len() != 0 || pool.lamports() != 0 {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    let rent = Rent::from_account_info(rent_sysvar)?;
    let rent_lamports = rent.minimum_balance(PoolState::LEN);
    let lamports = rent_lamports
        .checked_add(args.reward_reserve)
        .ok_or(ProgramError::InvalidInstructionData)?;

    invoke_signed(
        &system_instruction::create_account(
            authority.key,
            pool.key,
            lamports,
            PoolState::LEN as u64,
            program_id,
        ),
        &[
            authority.clone(),
            pool.clone(),
            system_program_account.clone(),
        ],
        &[&[POOL_SEED, &[bump]]],
    )?;

    let state = PoolState {
        bump,
        authority: *authority.key,
        reward_rate: args.reward_rate,
        total_staked: 0,
    };
    state.write(&mut pool.try_borrow_mut_data()?)?;

    msg!("TrustLedger SOL staking pool initialized");
    Ok(())
}

fn process_stake(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    if amount == 0 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let account_iter = &mut accounts.iter();
    let owner = next_account_info(account_iter)?;
    let pool = next_account_info(account_iter)?;
    let stake_account = next_account_info(account_iter)?;
    let system_program_account = next_account_info(account_iter)?;
    let rent_sysvar = next_account_info(account_iter)?;

    require_signer(owner)?;
    if *system_program_account.key != system_program::id() {
        return Err(ProgramError::IncorrectProgramId);
    }
    require_pda(pool, &[POOL_SEED], program_id)?;
    require_program_owned(pool, program_id)?;
    let stake_bump = require_pda(stake_account, &[STAKE_SEED, owner.key.as_ref()], program_id)?;

    let now = Clock::get()?.unix_timestamp;
    let mut pool_state = PoolState::read(&pool.try_borrow_data()?)?;

    // First stake creates the owner's stake PDA; subsequent stakes reuse it.
    if stake_account.data_len() == 0 {
        let rent = Rent::from_account_info(rent_sysvar)?;
        invoke_signed(
            &system_instruction::create_account(
                owner.key,
                stake_account.key,
                rent.minimum_balance(StakeState::LEN),
                StakeState::LEN as u64,
                program_id,
            ),
            &[
                owner.clone(),
                stake_account.clone(),
                system_program_account.clone(),
            ],
            &[&[STAKE_SEED, owner.key.as_ref(), &[stake_bump]]],
        )?;
        let fresh = StakeState::new(stake_bump, *owner.key, now);
        fresh.write(&mut stake_account.try_borrow_mut_data()?)?;
    }
    require_program_owned(stake_account, program_id)?;

    let mut stake_state = StakeState::read(&stake_account.try_borrow_data()?)?;
    if stake_state.owner != *owner.key {
        return Err(ProgramError::IllegalOwner);
    }

    // Move the staked lamports from the owner wallet into their program-owned stake PDA.
    invoke(
        &system_instruction::transfer(owner.key, stake_account.key, amount),
        &[
            owner.clone(),
            stake_account.clone(),
            system_program_account.clone(),
        ],
    )?;

    stake_state.accrue(now, pool_state.reward_rate)?;
    stake_state.add_stake(amount)?;
    pool_state.total_staked = pool_state
        .total_staked
        .checked_add(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    stake_state.write(&mut stake_account.try_borrow_mut_data()?)?;
    pool_state.write(&mut pool.try_borrow_mut_data()?)?;
    Ok(())
}

fn process_unstake(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let account_iter = &mut accounts.iter();
    let owner = next_account_info(account_iter)?;
    let pool = next_account_info(account_iter)?;
    let stake_account = next_account_info(account_iter)?;

    require_signer(owner)?;
    require_pda(pool, &[POOL_SEED], program_id)?;
    require_program_owned(pool, program_id)?;
    require_pda(stake_account, &[STAKE_SEED, owner.key.as_ref()], program_id)?;
    require_program_owned(stake_account, program_id)?;

    let now = Clock::get()?.unix_timestamp;
    let mut pool_state = PoolState::read(&pool.try_borrow_data()?)?;
    let mut stake_state = StakeState::read(&stake_account.try_borrow_data()?)?;
    if stake_state.owner != *owner.key {
        return Err(ProgramError::IllegalOwner);
    }

    stake_state.accrue(now, pool_state.reward_rate)?;
    stake_state.remove_stake(amount)?;
    pool_state.total_staked = pool_state
        .total_staked
        .checked_sub(amount)
        .ok_or(ProgramError::InsufficientFunds)?;

    // Stake principal is held directly on the program-owned PDA, so debit it and credit the owner.
    transfer_owned_lamports(stake_account, owner, amount)?;

    stake_state.write(&mut stake_account.try_borrow_mut_data()?)?;
    pool_state.write(&mut pool.try_borrow_mut_data()?)?;
    Ok(())
}

fn process_claim_rewards(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if !data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    let account_iter = &mut accounts.iter();
    let owner = next_account_info(account_iter)?;
    let pool = next_account_info(account_iter)?;
    let stake_account = next_account_info(account_iter)?;

    require_signer(owner)?;
    require_pda(pool, &[POOL_SEED], program_id)?;
    require_program_owned(pool, program_id)?;
    require_pda(stake_account, &[STAKE_SEED, owner.key.as_ref()], program_id)?;
    require_program_owned(stake_account, program_id)?;

    let now = Clock::get()?.unix_timestamp;
    let pool_state = PoolState::read(&pool.try_borrow_data()?)?;
    let mut stake_state = StakeState::read(&stake_account.try_borrow_data()?)?;
    if stake_state.owner != *owner.key {
        return Err(ProgramError::IllegalOwner);
    }

    stake_state.accrue(now, pool_state.reward_rate)?;
    let claimable = stake_state.take_rewards();
    if claimable == 0 {
        stake_state.write(&mut stake_account.try_borrow_mut_data()?)?;
        return Ok(());
    }

    // Rewards are paid from the pool reserve; the pool PDA must keep enough lamports to stay
    // rent-exempt. A short reserve fails safely rather than draining the account below rent.
    let rent = Rent::get()?;
    let reserve_floor = rent.minimum_balance(PoolState::LEN);
    let available = pool.lamports().saturating_sub(reserve_floor);
    if claimable > available {
        return Err(ProgramError::InsufficientFunds);
    }
    transfer_owned_lamports(pool, owner, claimable)?;

    stake_state.write(&mut stake_account.try_borrow_mut_data()?)?;
    msg!("TrustLedger SOL staking rewards claimed");
    Ok(())
}

/// Moves `amount` lamports from a program-owned `source` account to `destination` by direct lamport
/// arithmetic. Valid only when `source` is owned by this program (callers verify this first).
fn transfer_owned_lamports(
    source: &AccountInfo,
    destination: &AccountInfo,
    amount: u64,
) -> ProgramResult {
    let mut source_lamports = source.try_borrow_mut_lamports()?;
    let mut destination_lamports = destination.try_borrow_mut_lamports()?;
    **source_lamports = source_lamports
        .checked_sub(amount)
        .ok_or(ProgramError::InsufficientFunds)?;
    **destination_lamports = destination_lamports
        .checked_add(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    Ok(())
}

// ─── Instruction data ──────────────────────────────────────────────────────────

struct InitializeArgs {
    reward_rate: u64,
    reward_reserve: u64,
}

impl InitializeArgs {
    fn parse(data: &[u8]) -> Result<Self, ProgramError> {
        let bytes: [u8; 16] = data
            .try_into()
            .map_err(|_| ProgramError::InvalidInstructionData)?;
        let (rate, reserve) = bytes.split_at(8);
        let reward_rate = u64::from_le_bytes(
            rate.try_into()
                .map_err(|_| ProgramError::InvalidInstructionData)?,
        );
        let reward_reserve = u64::from_le_bytes(
            reserve
                .try_into()
                .map_err(|_| ProgramError::InvalidInstructionData)?,
        );
        Ok(Self {
            reward_rate,
            reward_reserve,
        })
    }
}

// ─── Pure state ────────────────────────────────────────────────────────────────

/// Singleton staking pool configuration and accounting.
struct PoolState {
    bump: u8,
    authority: Pubkey,
    reward_rate: u64,
    total_staked: u64,
}

impl PoolState {
    const LEN: usize = 8 + 1 + 1 + 32 + 8 + 8;

    fn read(data: &[u8]) -> Result<Self, ProgramError> {
        let mut r = Reader::new(data, POOL_MAGIC)?;
        let bump = r.u8()?;
        let authority = r.pubkey()?;
        let reward_rate = r.u64()?;
        let total_staked = r.u64()?;
        Ok(Self {
            bump,
            authority,
            reward_rate,
            total_staked,
        })
    }

    fn write(&self, data: &mut [u8]) -> ProgramResult {
        let mut w = Writer::new(data, POOL_MAGIC, Self::LEN)?;
        w.u8(self.bump)?;
        w.pubkey(&self.authority)?;
        w.u64(self.reward_rate)?;
        w.u64(self.total_staked)
    }
}

/// Per-owner stake position: custodied principal plus accrued, unclaimed rewards.
struct StakeState {
    bump: u8,
    owner: Pubkey,
    staked: u64,
    pending_rewards: u64,
    checkpoint_ts: i64,
}

impl StakeState {
    const LEN: usize = 8 + 1 + 1 + 32 + 8 + 8 + 8;

    fn new(bump: u8, owner: Pubkey, now_ts: i64) -> Self {
        Self {
            bump,
            owner,
            staked: 0,
            pending_rewards: 0,
            checkpoint_ts: now_ts,
        }
    }

    fn read(data: &[u8]) -> Result<Self, ProgramError> {
        let mut r = Reader::new(data, STAKE_MAGIC)?;
        let bump = r.u8()?;
        let owner = r.pubkey()?;
        let staked = r.u64()?;
        let pending_rewards = r.u64()?;
        let checkpoint_ts = r.i64()?;
        Ok(Self {
            bump,
            owner,
            staked,
            pending_rewards,
            checkpoint_ts,
        })
    }

    fn write(&self, data: &mut [u8]) -> ProgramResult {
        let mut w = Writer::new(data, STAKE_MAGIC, Self::LEN)?;
        w.u8(self.bump)?;
        w.pubkey(&self.owner)?;
        w.u64(self.staked)?;
        w.u64(self.pending_rewards)?;
        w.i64(self.checkpoint_ts)
    }

    /// Folds rewards earned since the last checkpoint into `pending_rewards` and advances the
    /// checkpoint. Reward = staked * rate * elapsed_seconds / `REWARD_SCALE`. A non-advancing or
    /// backwards clock accrues nothing, never rewards.
    fn accrue(&mut self, now_ts: i64, reward_rate: u64) -> ProgramResult {
        let elapsed = now_ts.saturating_sub(self.checkpoint_ts);
        self.checkpoint_ts = now_ts;
        if elapsed <= 0 || self.staked == 0 || reward_rate == 0 {
            return Ok(());
        }
        let reward = u128::from(self.staked)
            .checked_mul(u128::from(reward_rate))
            .and_then(|v| v.checked_mul(u128::from(elapsed.unsigned_abs())))
            .map(|v| v / REWARD_SCALE)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        let reward = u64::try_from(reward).map_err(|_| ProgramError::ArithmeticOverflow)?;
        self.pending_rewards = self
            .pending_rewards
            .checked_add(reward)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        Ok(())
    }

    fn add_stake(&mut self, amount: u64) -> ProgramResult {
        self.staked = self
            .staked
            .checked_add(amount)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        Ok(())
    }

    /// Reduces the staked principal, rejecting a zero amount or any amount above the balance.
    fn remove_stake(&mut self, amount: u64) -> ProgramResult {
        if amount == 0 || amount > self.staked {
            return Err(ProgramError::InvalidInstructionData);
        }
        self.staked -= amount;
        Ok(())
    }

    /// Resets and returns the claimable reward balance.
    fn take_rewards(&mut self) -> u64 {
        let rewards = self.pending_rewards;
        self.pending_rewards = 0;
        rewards
    }
}

// ─── Serialization primitives ──────────────────────────────────────────────────

struct Reader<'a> {
    data: &'a [u8],
    offset: usize,
}

impl<'a> Reader<'a> {
    fn new(data: &'a [u8], magic: &[u8; 8]) -> Result<Self, ProgramError> {
        let header = data.get(0..8).ok_or(ProgramError::AccountDataTooSmall)?;
        if header != magic {
            return Err(ProgramError::InvalidAccountData);
        }
        let version = *data.get(8).ok_or(ProgramError::AccountDataTooSmall)?;
        if version != STATE_VERSION {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(Self { data, offset: 9 })
    }

    fn take(&mut self, len: usize) -> Result<&'a [u8], ProgramError> {
        let end = self
            .offset
            .checked_add(len)
            .ok_or(ProgramError::AccountDataTooSmall)?;
        let slice = self
            .data
            .get(self.offset..end)
            .ok_or(ProgramError::AccountDataTooSmall)?;
        self.offset = end;
        Ok(slice)
    }

    fn u8(&mut self) -> Result<u8, ProgramError> {
        Ok(self.take(1)?[0])
    }

    fn u64(&mut self) -> Result<u64, ProgramError> {
        let bytes: [u8; 8] = self
            .take(8)?
            .try_into()
            .map_err(|_| ProgramError::InvalidAccountData)?;
        Ok(u64::from_le_bytes(bytes))
    }

    fn i64(&mut self) -> Result<i64, ProgramError> {
        let bytes: [u8; 8] = self
            .take(8)?
            .try_into()
            .map_err(|_| ProgramError::InvalidAccountData)?;
        Ok(i64::from_le_bytes(bytes))
    }

    fn pubkey(&mut self) -> Result<Pubkey, ProgramError> {
        let bytes: [u8; 32] = self
            .take(32)?
            .try_into()
            .map_err(|_| ProgramError::InvalidAccountData)?;
        Ok(Pubkey::new_from_array(bytes))
    }
}

struct Writer<'a> {
    data: &'a mut [u8],
    offset: usize,
}

impl<'a> Writer<'a> {
    fn new(data: &'a mut [u8], magic: &[u8; 8], expected_len: usize) -> Result<Self, ProgramError> {
        if data.len() != expected_len {
            return Err(ProgramError::AccountDataTooSmall);
        }
        let mut writer = Self { data, offset: 0 };
        writer.bytes(magic)?;
        writer.u8(STATE_VERSION)?;
        Ok(writer)
    }

    fn bytes(&mut self, value: &[u8]) -> ProgramResult {
        let end = self
            .offset
            .checked_add(value.len())
            .ok_or(ProgramError::AccountDataTooSmall)?;
        let target = self
            .data
            .get_mut(self.offset..end)
            .ok_or(ProgramError::AccountDataTooSmall)?;
        target.copy_from_slice(value);
        self.offset = end;
        Ok(())
    }

    fn u8(&mut self, value: u8) -> ProgramResult {
        self.bytes(&[value])
    }

    fn u64(&mut self, value: u64) -> ProgramResult {
        self.bytes(&value.to_le_bytes())
    }

    fn i64(&mut self, value: i64) -> ProgramResult {
        self.bytes(&value.to_le_bytes())
    }

    fn pubkey(&mut self, value: &Pubkey) -> ProgramResult {
        self.bytes(value.as_ref())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stake_increases_balance() {
        let mut state = StakeState::new(1, Pubkey::new_from_array([7; 32]), 0);
        assert_eq!(state.staked, 0);
        assert!(state.add_stake(100).is_ok());
        assert_eq!(state.staked, 100);
        assert!(state.add_stake(50).is_ok());
        assert_eq!(state.staked, 150);
    }

    #[test]
    fn unstake_decreases_balance() {
        let mut state = StakeState::new(1, Pubkey::new_from_array([7; 32]), 0);
        assert!(state.add_stake(150).is_ok());
        assert!(state.remove_stake(50).is_ok());
        assert_eq!(state.staked, 100);
    }

    #[test]
    fn unstake_rejects_invalid_transitions() {
        let mut state = StakeState::new(1, Pubkey::new_from_array([7; 32]), 0);
        assert!(state.add_stake(100).is_ok());
        // More than staked: rejected, balance untouched.
        assert!(matches!(
            state.remove_stake(101),
            Err(ProgramError::InvalidInstructionData)
        ));
        // Zero amount: rejected.
        assert!(matches!(
            state.remove_stake(0),
            Err(ProgramError::InvalidInstructionData)
        ));
        assert_eq!(state.staked, 100);
    }

    #[test]
    fn rewards_accrue_linearly_and_claim_resets() {
        // rate == REWARD_SCALE pays 1 lamport per staked lamport per second.
        let mut state = StakeState::new(1, Pubkey::new_from_array([7; 32]), 100);
        assert!(state.add_stake(10).is_ok());
        let rate = u64::try_from(REWARD_SCALE).unwrap_or(u64::MAX);
        assert!(state.accrue(110, rate).is_ok()); // 10 staked * 10s = 100
        assert_eq!(state.pending_rewards, 100);
        assert_eq!(state.take_rewards(), 100);
        assert_eq!(state.pending_rewards, 0);
    }

    #[test]
    fn accrue_ignores_non_advancing_clock() {
        let mut state = StakeState::new(1, Pubkey::new_from_array([7; 32]), 100);
        assert!(state.add_stake(10).is_ok());
        let rate = u64::try_from(REWARD_SCALE).unwrap_or(u64::MAX);
        assert!(state.accrue(90, rate).is_ok()); // backwards clock
        assert_eq!(state.pending_rewards, 0);
    }

    #[test]
    fn require_signer_enforced() {
        // Signer validation is the same predicate the processor uses for authorization.
        assert!(matches!(
            signer_result(false),
            Err(ProgramError::MissingRequiredSignature)
        ));
        assert!(signer_result(true).is_ok());
    }

    fn signer_result(is_signer: bool) -> ProgramResult {
        if is_signer {
            Ok(())
        } else {
            Err(ProgramError::MissingRequiredSignature)
        }
    }

    #[test]
    fn pool_state_round_trips() {
        let state = PoolState {
            bump: 254,
            authority: Pubkey::new_from_array([3; 32]),
            reward_rate: 123_456,
            total_staked: 9_000,
        };
        let mut buf = vec![0_u8; PoolState::LEN];
        assert!(state.write(&mut buf).is_ok());
        let decoded = PoolState::read(&buf).ok();
        assert!(decoded.is_some());
        if let Some(decoded) = decoded {
            assert_eq!(decoded.bump, 254);
            assert_eq!(decoded.authority, Pubkey::new_from_array([3; 32]));
            assert_eq!(decoded.reward_rate, 123_456);
            assert_eq!(decoded.total_staked, 9_000);
        }
    }

    #[test]
    fn stake_state_round_trips() {
        let mut state = StakeState::new(255, Pubkey::new_from_array([9; 32]), 42);
        assert!(state.add_stake(777).is_ok());
        state.pending_rewards = 5;
        let mut buf = vec![0_u8; StakeState::LEN];
        assert!(state.write(&mut buf).is_ok());
        let decoded = StakeState::read(&buf).ok();
        assert!(decoded.is_some());
        if let Some(decoded) = decoded {
            assert_eq!(decoded.staked, 777);
            assert_eq!(decoded.pending_rewards, 5);
            assert_eq!(decoded.checkpoint_ts, 42);
            assert_eq!(decoded.owner, Pubkey::new_from_array([9; 32]));
        }
    }

    #[test]
    fn read_rejects_bad_magic_and_version() {
        let mut buf = vec![0_u8; PoolState::LEN];
        assert!(matches!(
            PoolState::read(&buf),
            Err(ProgramError::InvalidAccountData)
        ));
        // Correct magic, wrong version.
        buf[0..8].copy_from_slice(POOL_MAGIC);
        buf[8] = STATE_VERSION + 1;
        assert!(matches!(
            PoolState::read(&buf),
            Err(ProgramError::InvalidAccountData)
        ));
    }

    #[test]
    fn parse_initialize_args() {
        let mut data = Vec::new();
        data.extend_from_slice(&50_u64.to_le_bytes());
        data.extend_from_slice(&1_000_u64.to_le_bytes());
        let args = InitializeArgs::parse(&data).ok();
        assert!(args.is_some());
        if let Some(args) = args {
            assert_eq!(args.reward_rate, 50);
            assert_eq!(args.reward_reserve, 1_000);
        }
        // Truncated input is rejected.
        assert!(matches!(
            InitializeArgs::parse(&data[..8]),
            Err(ProgramError::InvalidInstructionData)
        ));
    }
}
