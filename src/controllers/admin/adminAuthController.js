const db = require("../../config/db");
const bcrypt = require("bcrypt");
const { sendOtpEmail } = require("../../utils/emailService");
const { generateAccessToken } = require("../../utils/jwt");

exports.signup = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      username,
      email,
      phone_code,
      phone_number,
      date_of_birth,
      password,
    } = req.body;

    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length)
      return res.status(409).json({ message: "Email already exists" });

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (first_name, last_name, username, email, phone_code, phone_number, date_of_birth, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name,
        username,
        email,
        "+91",
        phone_number,
        date_of_birth,
        password_hash,
        "admin",
      ]
    );

    res.status(201).json({ message: "Signup successful. OTP sent.", email });
  } catch (err) {
    console.error("Signup error", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (!users.length)
      return res.status(404).json({ message: "User not found" });

    const user = users[0];
    if (user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    const token = generateAccessToken(user);
    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Server error" });
  }
};
