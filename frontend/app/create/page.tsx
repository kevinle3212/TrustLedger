"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, keccak256, toBytes } from "viem";
import { TRUSTLEDGER_ABI } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import { daysToSeconds } from "@/lib/utils";

const SECONDS_PER_DAY = 86400n;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-200">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="rounded-lg bg-gray-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
    />
  );
}

export default function CreatePage() {
  const { isConnected } = useAccount();
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  const [form, setForm] = useState({
    freelancer: "",
    amountEth: "",
    contractURI: "",
    estimatedDurationDays: "30",
    bufferFactor: "1200",
    acceptanceWindowDays: "3",
    arbitrationFeePct: "5",
    holdBack: "none" as "none" | "5" | "10" | "15",
    warrantyPeriodDays: "30",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const estimatedDuration = daysToSeconds(Number(form.estimatedDurationDays));
    const acceptanceWindow = daysToSeconds(Number(form.acceptanceWindowDays));
    const warrantyPeriod = BigInt(Number(form.warrantyPeriodDays) * 86400);
    const bufferFactor = BigInt(form.bufferFactor);
    const arbitrationFeeBps = BigInt(Math.round(Number(form.arbitrationFeePct) * 100));
    const holdBackBps =
      form.holdBack === "none" ? 0n : BigInt(Number(form.holdBack) * 100);
    const contractURI = form.contractURI.trim() || "ipfs://";
    const contractHash = keccak256(toBytes(contractURI));
    const value = parseEther(form.amountEth);

    writeContract({
      address: TRUSTLEDGER_ADDRESS,
      abi: TRUSTLEDGER_ABI,
      functionName: "createContract",
      args: [
        form.freelancer as `0x${string}`,
        contractHash,
        contractURI,
        estimatedDuration,
        bufferFactor,
        acceptanceWindow,
        Number(arbitrationFeeBps) as unknown as number,
        Number(holdBackBps) as unknown as number,
        warrantyPeriod,
      ],
      value,
    });
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-32">
        <p className="text-gray-400 text-lg">Connect your wallet to create a contract.</p>
        <ConnectButton />
      </div>
    );
  }

  if (isSuccess && receipt) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold">Contract Created!</h2>
        <p className="text-gray-400 text-sm">
          Transaction confirmed in block {receipt.blockNumber.toString()}.
        </p>
        <a
          href={`https://sepolia.arbiscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-2"
        >
          View on Arbiscan
        </a>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
        >
          Create Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Escrow Contract</h1>
        <p className="text-gray-400 mt-2 text-sm">
          ETH will be held in escrow until the freelancer delivers and you approve — or a dispute is resolved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Parties */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-white">Parties &amp; Payment</h2>

          <Field label="Freelancer Address" hint="The wallet that will receive payment on completion.">
            <Input
              type="text"
              placeholder="0x..."
              value={form.freelancer}
              onChange={(e) => set("freelancer", e.target.value)}
              required
              pattern="^0x[0-9a-fA-F]{40}$"
            />
          </Field>

          <Field label="Escrow Amount (ETH)" hint="Total ETH to lock in escrow.">
            <Input
              type="number"
              placeholder="0.5"
              min="0.000001"
              step="any"
              value={form.amountEth}
              onChange={(e) => set("amountEth", e.target.value)}
              required
            />
          </Field>

          <Field
            label="Contract Document URI"
            hint="IPFS link or URL to the off-chain agreement. A hash of this is stored on-chain."
          >
            <Input
              type="text"
              placeholder="ipfs://Qm..."
              value={form.contractURI}
              onChange={(e) => set("contractURI", e.target.value)}
            />
          </Field>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-white">Timeline</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Estimated Duration (days)"
              hint="How long the project should take."
            >
              <Input
                type="number"
                min="1"
                value={form.estimatedDurationDays}
                onChange={(e) => set("estimatedDurationDays", e.target.value)}
                required
              />
            </Field>

            <Field
              label="Buffer Factor"
              hint="Project deadline = duration × buffer / 1000. E.g. 1200 = 1.2× buffer."
            >
              <Input
                type="number"
                min="1000"
                step="100"
                value={form.bufferFactor}
                onChange={(e) => set("bufferFactor", e.target.value)}
                required
              />
            </Field>
          </div>

          <Field
            label="Acceptance Window (days)"
            hint="How long you have to review submitted work. Minimum 2 days."
          >
            <Input
              type="number"
              min="2"
              value={form.acceptanceWindowDays}
              onChange={(e) => set("acceptanceWindowDays", e.target.value)}
              required
            />
          </Field>
        </div>

        {/* Advanced */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-white">Advanced Options</h2>

          <Field
            label="Arbitration Fee (%)"
            hint="Percentage of escrow set aside for jurors if a dispute is opened (0–50%)."
          >
            <Input
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={form.arbitrationFeePct}
              onChange={(e) => set("arbitrationFeePct", e.target.value)}
              required
            />
          </Field>

          <Field
            label="Warranty Hold-back"
            hint="Portion withheld from the freelancer until the warranty period elapses."
          >
            <Select
              value={form.holdBack}
              onChange={(e) => set("holdBack", e.target.value as typeof form.holdBack)}
            >
              <option value="none">None</option>
              <option value="5">5%</option>
              <option value="10">10%</option>
              <option value="15">15%</option>
            </Select>
          </Field>

          {form.holdBack !== "none" && (
            <Field label="Warranty Period (days)" hint="How long the hold-back is locked after work is approved.">
              <Input
                type="number"
                min="1"
                value={form.warrantyPeriodDays}
                onChange={(e) => set("warrantyPeriodDays", e.target.value)}
                required
              />
            </Field>
          )}
        </div>

        {/* Summary */}
        {form.amountEth && (
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm text-gray-300 flex flex-col gap-1">
            <p>
              <span className="text-gray-400">Escrow amount:</span>{" "}
              <span className="text-white font-medium">{form.amountEth} ETH</span>
            </p>
            <p>
              <span className="text-gray-400">Deadline:</span>{" "}
              <span className="text-white font-medium">
                ~{Math.round((Number(form.estimatedDurationDays) * Number(form.bufferFactor)) / 1000)} days from now
              </span>
            </p>
            {form.holdBack !== "none" && (
              <p>
                <span className="text-gray-400">Hold-back:</span>{" "}
                <span className="text-white font-medium">
                  {form.holdBack}% ({((Number(form.amountEth) * Number(form.holdBack)) / 100).toFixed(6)} ETH)
                </span>
              </p>
            )}
          </div>
        )}

        {writeError && (
          <p className="text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
            {(writeError as { shortMessage?: string }).shortMessage ?? writeError.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
        >
          {isPending
            ? "Waiting for wallet…"
            : isConfirming
            ? "Confirming on-chain…"
            : "Create Escrow Contract"}
        </button>
      </form>
    </div>
  );
}
