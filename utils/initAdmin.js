const User = require("../models/User");

/**
 * Initialize default admin user if it doesn't exist
 * This function is called on server startup
 */
async function initializeAdmin() {
  try {
    const adminData = {
      telegramId: "1261889753",
      username: "biloliddin_salimov",
      firstName: "Biloliddin",
      lastName: "Salimov",
      phoneNumber: "+998996366014",
      avatarUrl: "",
      role: "admin",
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      telegramId: adminData.telegramId,
    });

    if (existingAdmin) {
      console.log("✅ Admin user already exists");
      return existingAdmin;
    }

    // Create new admin user
    const admin = new User(adminData);
    await admin.save();

    console.log("🎉 Admin user created successfully");
    console.log(`   Username: ${admin.username}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Phone: ${admin.phoneNumber}`);
    console.log(`   Role: ${admin.role}`);

    return admin;
  } catch (error) {
    console.error("❌ Error initializing admin user:", error.message);
    // Don't throw error - allow server to start even if admin creation fails
    return null;
  }
}

module.exports = initializeAdmin;
