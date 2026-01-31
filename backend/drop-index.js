const mongoose = require("mongoose");
require("dotenv").config();

const dropEmployeeUserIdIndex = async () => {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URL);
        console.log("✅ Connected to MongoDB");

        const Employee = mongoose.model("Employee", new mongoose.Schema({}));

        console.log("🔄 Checking indexes on Employee collection...");
        const indexes = await Employee.collection.indexes();
        console.log("📊 Current indexes:", indexes.map(idx => idx.name));

        const userIdIndex = indexes.find(idx => idx.key && idx.key.userId);

        if (userIdIndex) {
            console.log(`🔄 Dropping index: ${userIdIndex.name}...`);
            await Employee.collection.dropIndex(userIdIndex.name);
            console.log("✅ Index dropped successfully");
        } else {
            console.log("ℹ️ No userId index found to drop");
        }

        // Also check for user email index just in case it's misconfigured
        // (But User email SHOULD be unique, so we leave it)

    } catch (error) {
        console.error("❌ Error dropping index:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔄 Disconnected from MongoDB");
        process.exit(0);
    }
};

dropEmployeeUserIdIndex();
