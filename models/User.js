const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    unique: true,
    sparse: true,
  },
  username: {
    type: String,
    default: "",
  },
  firstName: {
    type: String,
    default: "",
  },
  lastName: {
    type: String,
    default: "",
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  avatarUrl: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    enum: ["admin", "seller"],
    default: "seller",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  assignedProducts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", userSchema);
