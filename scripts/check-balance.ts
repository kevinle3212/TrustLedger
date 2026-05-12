import { ethers } from "hardhat";

async function main(): Promise<void> {
    // Get the first signer (deployer) from the list of available signers.
    const [deployer] = await ethers.getSigners();

    // Get the balance of the deployer's address in wei.
    const balance = await ethers.provider.getBalance(deployer.address);

    // Log the deployer's address and balance.
    console.log("Address:", deployer.address);
    console.log("Balance (wei):", balance);
    // Convert the balance from wei to ether and log it.
    console.log("Balance:", ethers.formatEther(balance), "ETH");
}

void main().catch((error: unknown): void => {
    console.error(error);
    process.exitCode = 1;
});