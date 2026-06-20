export type SuperAdminBootstrapConfig = {
  account: string;
  password: string;
  name: string;
};

function requireEnv(name: "ADMIN_ACCOUNT" | "ADMIN_PASSWORD" | "ADMIN_NAME") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for explicit super admin bootstrap.`);
  }
  return value;
}

export function readSuperAdminBootstrapConfig(): SuperAdminBootstrapConfig {
  return {
    account: requireEnv("ADMIN_ACCOUNT"),
    password: requireEnv("ADMIN_PASSWORD"),
    name: requireEnv("ADMIN_NAME"),
  };
}
