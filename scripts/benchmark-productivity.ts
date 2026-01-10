
import { prisma } from "@/lib/prisma";
import { calculateProjectProductivity, calculateUserProductivity } from "@/lib/productivity";

async function main() {
    console.log("Starting benchmark...");

    // 1. Fetch data
    console.log("Fetching sample data...");
    const projects = await prisma.project.findMany({ take: 5 });
    const users = await prisma.user.findMany({ take: 5 });

    if (projects.length === 0) console.warn("No projects found to test.");
    if (users.length === 0) console.warn("No users found to test.");

    const period = {
        start: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
        end: new Date()
    };

    console.log(`Testing period: ${period.start.toISOString()} to ${period.end.toISOString()}`);

    // 2. Benchmark Project Productivity
    console.log("\n--- Benchmarking Project Productivity ---");
    for (const project of projects) {
        const start = performance.now();
        await calculateProjectProductivity(project.id, period);
        const end = performance.now();
        console.log(`Project ID ${project.id}: ${(end - start).toFixed(2)}ms`);
    }

    // 3. Benchmark User Productivity
    console.log("\n--- Benchmarking User Productivity ---");
    for (const user of users) {
        const start = performance.now();
        await calculateUserProductivity(user.id, period);
        const end = performance.now();
        console.log(`User ID ${user.id}: ${(end - start).toFixed(2)}ms`);
    }

    console.log("\nBenchmark complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
