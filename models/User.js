const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    unique: true,
    sparse: true,
  },
  username: {
    type: String,
    default: "",
    index: true,
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
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.methods.inactivate = async function () {
  this.isActive = false;
  await this.save();
};

UserSchema.methods.activate = async function () {
  this.isActive = true;
  await this.save();
};

UserSchema.methods.delete = async function () {
  this.isDeleted = true;
  this.isActive = false;
  await this.save();
};

UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", UserSchema);
