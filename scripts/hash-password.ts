import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2] ?? process.env.ADMIN_PASSWORD_INPUT;

if (!password) {
  console.error("请通过命令参数或 ADMIN_PASSWORD_INPUT 提供密码。");
  process.exitCode = 1;
} else {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  console.log(`scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`);
}
