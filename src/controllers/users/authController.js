const db = require("../../config/db");
const bcrypt = require("bcrypt");
const { sendOtpEmail } = require("../../utils/emailService");
const { generateAccessToken } = require("../../utils/jwt");

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.signup = async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone_code,
      phone_number, date_of_birth, password
    } = req.body;

    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return res.status(409).json({ message: "Email already exists" });

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (first_name, last_name, email, phone_code, phone_number, date_of_birth, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, phone_code, phone_number, date_of_birth, password_hash, "user"]
    );

    const user_id = result.insertId;
    const otp = generateOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      `INSERT INTO otp_verifications (user_id, otp_code, expires_at) VALUES (?, ?, ?)`,
      [user_id, otp, expires]
    );

    await sendOtpEmail(email, otp);
    res.status(201).json({ message: "Signup successful. OTP sent.", email });

  } catch (err) {
    console.error("Signup error", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!users.length) return res.status(404).json({ message: "User not found" });

    const user = users[0];
    const [records] = await db.query(
      `SELECT * FROM otp_verifications WHERE user_id = ? AND otp_code = ? AND verified = FALSE AND expires_at > NOW()`,
      [user.id, otp]
    );

    if (!records.length) return res.status(400).json({ message: "Invalid or expired OTP" });

    await db.query("UPDATE otp_verifications SET verified = TRUE WHERE id = ?", [records[0].id]);

    const token = generateAccessToken(user);
    res.json({ message: "OTP verified", token });

  } catch (err) {
    console.error("Verify OTP error", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!users.length) return res.status(404).json({ message: "User not found" });

    const user = users[0];
    const otp = generateOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      `INSERT INTO otp_verifications (user_id, otp_code, expires_at) VALUES (?, ?, ?)`,
      [user.id, otp, expires]
    );

    await sendOtpEmail(email, otp);
    res.json({ message: "OTP resent" });

  } catch (err) {
    console.error("Resend OTP error", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!users.length) return res.status(404).json({ message: "User not found" });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    const otp = generateOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      `INSERT INTO otp_verifications (user_id, otp_code, expires_at) VALUES (?, ?, ?)`,
      [user.id, otp, expires]
    );

    await sendOtpEmail(email, otp);
    res.json({ message: "Login OTP sent", email });

  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyOtpLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!users.length) return res.status(404).json({ message: "User not found" });

    const user = users[0];
    const [records] = await db.query(
      `SELECT * FROM otp_verifications WHERE user_id = ? AND otp_code = ? AND verified = FALSE AND expires_at > NOW()`,
      [user.id, otp]
    );

    if (!records.length) return res.status(400).json({ message: "Invalid or expired OTP" });

    await db.query("UPDATE otp_verifications SET verified = TRUE WHERE id = ?", [records[0].id]);

    const token = generateAccessToken(user);
    res.json({ message: "Login successful", token });

  } catch (err) {
    console.error("Verify login OTP error", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!users.length) return res.status(404).json({ message: "User not found" });

    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash = ? WHERE email = ?", [password_hash, email]);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error", err);
    res.status(500).json({ message: "Server error" });
  }
};
