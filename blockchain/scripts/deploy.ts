import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying MedConnect contract...\n");

    // Get signer with validation
    const signers = await ethers.getSigners();

    if (!signers || signers.length === 0) {
        throw new Error(
            "❌ No signers available!\n" +
            "Please check:\n" +
            "1. PRIVATE_KEY is set in .env (without 0x prefix)\n" +
            "2. .env file is in the blockchain/ directory\n" +
            "3. dotenv is properly configured in hardhat.config.ts"
        );
    }

    const deployer = signers[0];
    const deployerAddress = await deployer.getAddress();
    console.log("Deployer address:", deployerAddress);

    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log("Deployer balance:", ethers.formatEther(balance), "MATIC\n");

    if (balance === 0n) {
        console.warn("⚠️  WARNING: Deployer has 0 MATIC balance!");
        console.warn("Get test MATIC from: https://faucet.polygon.technology/\n");
    }

    // Deploy MedConnect
    console.log("📦 Deploying contract...");
    const MedConnect = await ethers.getContractFactory("MedConnect");
    const medconnect = await MedConnect.deploy();

    console.log("⏳ Waiting for deployment confirmation...");
    await medconnect.waitForDeployment();

    const contractAddress = await medconnect.getAddress();
    console.log("\n✅ MedConnect deployed to:", contractAddress);
    console.log("\n📋 Copy this address to your backend/.env file:");
    console.log(`CONTRACT_ADDRESS=${contractAddress}`);

    // Verify deployment
    const owner = await medconnect.owner();
    console.log("\n🔑 Contract owner:", owner);

    console.log("\n🎉 Deployment successful!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error.message);
        if (error.message.includes("insufficient funds")) {
            console.error("\n💡 Get test MATIC from: https://faucet.polygon.technology/");
        }
        process.exit(1);
    });