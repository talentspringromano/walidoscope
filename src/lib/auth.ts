const USERS = [
  {
    email: "romano@talentspring-academy.com",
    role: "admin" as const,
    passwordHash:
      "38782982ac57e32af8049c8da1849e8b96758188bc4c1b91f970c2180650a535",
  },
  {
    email: "lennard@talentspring-academy.com",
    role: "user" as const,
    passwordHash:
      "975d704d76d198bc6a10f64b67ec7ba1d67109e60e189f12a317c00c3f331fb0",
  },
];

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  email: string,
  password: string
): Promise<{ email: string; role: string } | null> {
  const user = USERS.find((u) => u.email === email);
  if (!user) return null;

  const hash = await sha256(password);
  if (hash !== user.passwordHash) return null;

  return { email: user.email, role: user.role };
}

const SECRET = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET env var is required");
  return s;
};

export async function createSession(user: {
  email: string;
  role: string;
}): Promise<string> {
  const payload = JSON.stringify({
    email: user.email,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const data = btoa(payload);

  return `${data}.${sig}`;
}

export async function verifySession(
  token: string
): Promise<{ email: string; role: string } | null> {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;

    const payload = atob(data);

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload)
    );

    if (!valid) return null;

    const parsed = JSON.parse(payload);
    if (parsed.exp < Date.now()) return null;

    return { email: parsed.email, role: parsed.role };
  } catch {
    return null;
  }
}
