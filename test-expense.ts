import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/server/db/index.js";
import { financialEntries } from "./src/server/db/schema.js";

async function run() {
  await db.insert(financialEntries).values({
    id: crypto.randomUUID(),
    type: "expense",
    category: "Other",
    description: "Simulated Expense to show Loss State",
    amount: "5000.00",
    date: new Date(),
  });
  console.log("Expense added successfully!");
  process.exit(0);
}

run().catch(console.error);
