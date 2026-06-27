import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'users.json');

// Helper to load all users
async function loadUsers() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array and create it
    if (error.code === 'ENOENT') {
      await saveUsers([]);
      return [];
    }
    console.error('Error reading users.json database:', error);
    return [];
  }
}

// Helper to save all users
async function saveUsers(users) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to users.json database:', error);
  }
}

// Register a new user
export async function registerUser(username, password) {
  if (!username || !password || username.trim() === '' || password.trim() === '') {
    throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  }

  const cleanUsername = username.trim().toLowerCase();
  const users = await loadUsers();

  const userExists = users.some(u => u.username.toLowerCase() === cleanUsername);
  if (userExists) {
    throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = {
    username: username.trim(), // Keep casing for display
    passwordHash,
    chips: 10000, // Initial chips: 10,000 chips
    wins: 0,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await saveUsers(users);

  return { username: newUser.username, chips: newUser.chips, wins: newUser.wins };
}

// Authenticate user login
export async function loginUser(username, password) {
  if (!username || !password || username.trim() === '' || password.trim() === '') {
    throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  }

  const cleanUsername = username.trim().toLowerCase();
  const users = await loadUsers();

  const user = users.find(u => u.username.toLowerCase() === cleanUsername);
  if (!user) {
    throw new Error('ไม่พบชื่อผู้ใช้นี้ในระบบ');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }

  return { username: user.username, chips: user.chips, wins: user.wins };
}

// Get user chips
export async function getUserChips(username) {
  const users = await loadUsers();
  const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  return user ? user.chips : 10000;
}

// Save user chips
export async function saveUserChips(username, chips) {
  const users = await loadUsers();
  const cleanUsername = username.trim().toLowerCase();
  const userIndex = users.findIndex(u => u.username.toLowerCase() === cleanUsername);
  if (userIndex !== -1) {
    users[userIndex].chips = Math.max(0, chips);
    await saveUsers(users);
    return true;
  }
  return false;
}

// Record a win
export async function incrementUserWins(username) {
  const users = await loadUsers();
  const cleanUsername = username.trim().toLowerCase();
  const userIndex = users.findIndex(u => u.username.toLowerCase() === cleanUsername);
  if (userIndex !== -1) {
    users[userIndex].wins += 1;
    await saveUsers(users);
    return true;
  }
  return false;
}
