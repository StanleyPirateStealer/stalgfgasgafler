const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  userID: { type: String, unique: true },
  access_token: String,
  refresh_token: String,
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;
