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

UserSchema.methods.inactivate = async function (toSave = true) {
  this.isActive = false;
  if (toSave) await this.save();
  return this;
};

UserSchema.methods.activate = async function (toSave = true) {
  this.isActive = true;
  if (toSave) await this.save();
  return this;
};

UserSchema.methods.delete = async function (toSave = true) {
  this.isDeleted = true;
  this.isActive = false;
  if (toSave) await this.save();
  return this;
};

UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", UserSchema);
