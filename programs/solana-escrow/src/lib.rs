#![deny(missing_docs)]
//! Native Solana escrow initializer for TrustLedger.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};
use solana_sdk_ids::system_program;
use solana_system_interface::instruction as system_instruction;

entrypoint!(process_instruction);

const CREATE_ESCROW_DISCRIMINATOR: u8 = 0;
const ESCROW_SEED: &[u8] = b"trustledger_escrow";
const ESCROW_MAGIC: &[u8; 8] = b"TLESCRW1";
const ESCROW_VERSION: u8 = 1;
const MAX_CONTRACT_URI_BYTES: usize = 1024;

/// Creates a TrustLedger Solana escrow PDA and stores metadata for future flow.
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let create = CreateEscrowInstruction::parse(instruction_data)?;
    if create.discriminator != CREATE_ESCROW_DISCRIMINATOR {
        return Err(ProgramError::InvalidInstructionData);
    }

    let account_iter = &mut accounts.iter();
    let payer = next_account_info(account_iter)?;
    let counterparty = next_account_info(account_iter)?;
    let escrow = next_account_info(account_iter)?;
    let system_program_account = next_account_info(account_iter)?;
    let rent_sysvar = next_account_info(account_iter)?;

    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if *system_program_account.key != system_program::id() {
        return Err(ProgramError::IncorrectProgramId);
    }

    let (expected_escrow, bump) = Pubkey::find_program_address(
        &[
            ESCROW_SEED,
            payer.key.as_ref(),
            counterparty.key.as_ref(),
            &create.contract_hash,
        ],
        program_id,
    );
    if expected_escrow != *escrow.key {
        return Err(ProgramError::InvalidSeeds);
    }
    if escrow.data_len() != 0 || escrow.lamports() != 0 {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    let rent = Rent::from_account_info(rent_sysvar)?;
    let account_space = EscrowStateView::serialized_len(create.contract_uri_len);
    let rent_lamports = rent.minimum_balance(account_space);
    let account_lamports = rent_lamports
        .checked_add(create.amount_lamports)
        .ok_or(ProgramError::InvalidInstructionData)?;

    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            escrow.key,
            account_lamports,
            u64::try_from(account_space).map_err(|_| ProgramError::InvalidInstructionData)?,
            program_id,
        ),
        &[
            payer.clone(),
            escrow.clone(),
            system_program_account.clone(),
        ],
        &[&[
            ESCROW_SEED,
            payer.key.as_ref(),
            counterparty.key.as_ref(),
            &create.contract_hash,
            &[bump],
        ]],
    )?;

    let mut escrow_data = escrow.try_borrow_mut_data()?;
    write_escrow_state(
        &mut escrow_data,
        EscrowStateView {
            bump,
            payer: *payer.key,
            counterparty: *counterparty.key,
            amount_lamports: create.amount_lamports,
            duration_seconds: create.duration_seconds,
            acceptance_window_seconds: create.acceptance_window_seconds,
            arbitration_fee_bps: create.arbitration_fee_bps,
            hold_back_bps: create.hold_back_bps,
            warranty_seconds: create.warranty_seconds,
            contract_hash: create.contract_hash,
            proposer_role: create.proposer_role,
            contract_uri: create.contract_uri,
            contract_uri_len: create.contract_uri_len,
        },
    )?;

    msg!("TrustLedger Solana escrow initialized");
    Ok(())
}

struct CreateEscrowInstruction<'a> {
    discriminator: u8,
    amount_lamports: u64,
    duration_seconds: u64,
    acceptance_window_seconds: u64,
    arbitration_fee_bps: u16,
    hold_back_bps: u16,
    warranty_seconds: u64,
    contract_hash: [u8; 32],
    proposer_role: u8,
    contract_uri_len: usize,
    contract_uri: &'a [u8],
}

impl<'a> CreateEscrowInstruction<'a> {
    fn parse(data: &'a [u8]) -> Result<Self, ProgramError> {
        let mut reader = InstructionReader::new(data);
        let discriminator = reader.read_u8()?;
        let amount_lamports = reader.read_u64()?;
        let duration_seconds = reader.read_u64()?;
        let acceptance_window_seconds = reader.read_u64()?;
        let arbitration_fee_bps = reader.read_u16()?;
        let hold_back_bps = reader.read_u16()?;
        let warranty_seconds = reader.read_u64()?;
        let contract_hash = reader.read_hash()?;
        let proposer_role = reader.read_u8()?;
        if proposer_role > 1 {
            return Err(ProgramError::InvalidInstructionData);
        }
        let contract_uri_len = usize::from(reader.read_u16()?);
        if contract_uri_len > MAX_CONTRACT_URI_BYTES {
            return Err(ProgramError::InvalidInstructionData);
        }
        let contract_uri = reader.read_slice(contract_uri_len)?;
        if reader.remaining() != 0 {
            return Err(ProgramError::InvalidInstructionData);
        }
        if amount_lamports == 0 {
            return Err(ProgramError::InvalidInstructionData);
        }
        Ok(Self {
            discriminator,
            amount_lamports,
            duration_seconds,
            acceptance_window_seconds,
            arbitration_fee_bps,
            hold_back_bps,
            warranty_seconds,
            contract_hash,
            proposer_role,
            contract_uri_len,
            contract_uri,
        })
    }
}

struct InstructionReader<'a> {
    data: &'a [u8],
    offset: usize,
}

impl<'a> InstructionReader<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, offset: 0 }
    }

    fn remaining(&self) -> usize {
        self.data.len().saturating_sub(self.offset)
    }

    fn read_u8(&mut self) -> Result<u8, ProgramError> {
        let value = *self
            .data
            .get(self.offset)
            .ok_or(ProgramError::InvalidInstructionData)?;
        self.offset = self
            .offset
            .checked_add(1)
            .ok_or(ProgramError::InvalidInstructionData)?;
        Ok(value)
    }

    fn read_u16(&mut self) -> Result<u16, ProgramError> {
        let bytes = self.read_slice(2)?;
        Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
    }

    fn read_u64(&mut self) -> Result<u64, ProgramError> {
        let bytes = self.read_slice(8)?;
        Ok(u64::from_le_bytes([
            bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
        ]))
    }

    fn read_hash(&mut self) -> Result<[u8; 32], ProgramError> {
        let bytes = self.read_slice(32)?;
        let mut hash = [0_u8; 32];
        hash.copy_from_slice(bytes);
        Ok(hash)
    }

    fn read_slice(&mut self, len: usize) -> Result<&'a [u8], ProgramError> {
        let end = self
            .offset
            .checked_add(len)
            .ok_or(ProgramError::InvalidInstructionData)?;
        let bytes = self
            .data
            .get(self.offset..end)
            .ok_or(ProgramError::InvalidInstructionData)?;
        self.offset = end;
        Ok(bytes)
    }
}

struct EscrowStateView<'a> {
    bump: u8,
    payer: Pubkey,
    counterparty: Pubkey,
    amount_lamports: u64,
    duration_seconds: u64,
    acceptance_window_seconds: u64,
    arbitration_fee_bps: u16,
    hold_back_bps: u16,
    warranty_seconds: u64,
    contract_hash: [u8; 32],
    proposer_role: u8,
    contract_uri_len: usize,
    contract_uri: &'a [u8],
}

impl EscrowStateView<'_> {
    fn serialized_len(contract_uri_len: usize) -> usize {
        8 + 1 + 1 + 32 + 32 + 8 + 8 + 8 + 2 + 2 + 8 + 32 + 1 + 1 + 2 + contract_uri_len
    }
}

fn write_escrow_state(target: &mut [u8], state: EscrowStateView) -> ProgramResult {
    if target.len() != EscrowStateView::serialized_len(state.contract_uri_len) {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut offset = 0_usize;
    write_bytes(target, &mut offset, ESCROW_MAGIC)?;
    write_u8(target, &mut offset, ESCROW_VERSION)?;
    write_u8(target, &mut offset, state.bump)?;
    write_bytes(target, &mut offset, state.payer.as_ref())?;
    write_bytes(target, &mut offset, state.counterparty.as_ref())?;
    write_u64(target, &mut offset, state.amount_lamports)?;
    write_u64(target, &mut offset, state.duration_seconds)?;
    write_u64(target, &mut offset, state.acceptance_window_seconds)?;
    write_u16(target, &mut offset, state.arbitration_fee_bps)?;
    write_u16(target, &mut offset, state.hold_back_bps)?;
    write_u64(target, &mut offset, state.warranty_seconds)?;
    write_bytes(target, &mut offset, &state.contract_hash)?;
    write_u8(target, &mut offset, state.proposer_role)?;
    write_u8(target, &mut offset, 0)?;
    write_u16(
        target,
        &mut offset,
        u16::try_from(state.contract_uri_len).map_err(|_| ProgramError::InvalidInstructionData)?,
    )?;
    write_bytes(target, &mut offset, state.contract_uri)?;
    Ok(())
}

fn write_u8(target: &mut [u8], offset: &mut usize, value: u8) -> ProgramResult {
    write_bytes(target, offset, &[value])
}

fn write_u16(target: &mut [u8], offset: &mut usize, value: u16) -> ProgramResult {
    write_bytes(target, offset, &value.to_le_bytes())
}

fn write_u64(target: &mut [u8], offset: &mut usize, value: u64) -> ProgramResult {
    write_bytes(target, offset, &value.to_le_bytes())
}

fn write_bytes(target: &mut [u8], offset: &mut usize, value: &[u8]) -> ProgramResult {
    let end = offset
        .checked_add(value.len())
        .ok_or(ProgramError::InvalidInstructionData)?;
    let target_slice = target
        .get_mut(*offset..end)
        .ok_or(ProgramError::AccountDataTooSmall)?;
    target_slice.copy_from_slice(value);
    *offset = end;
    Ok(())
}
