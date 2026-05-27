import { createHmac, timingSafeEqual } from "node:crypto";
import { PrismaClient, type UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3003";
const authCookieName = "oilchanger_session";

type SmokeSession = {
  userId: string;
  role: UserRole;
  tenantId: string;
  shopId: string;
  countryCode: string;
};

type SmokeCase = {
  label: string;
  path: string;
  session?: SmokeSession;
  expect: {
    status?: number;
    redirectIncludes?: string;
  };
};

const demoAccounts = {
  platformOwner: "admin@oilchanger.local",
  shopOwner: "owner@demo.oilchanger.local",
  branchAdmin: "branch.admin@demo.oilchanger.local",
  mechanic: "mechanic@demo.oilchanger.local",
};

async function main() {
  const sessions = await loadSmokeSessions();
  const cases: SmokeCase[] = [
    {
      label: "guest dashboard redirects to login",
      path: "/dashboard?locale=ru",
      expect: { redirectIncludes: "/login?locale=ru" },
    },
    {
      label: "platform owner can open admin",
      path: "/admin?locale=ru",
      session: sessions.platformOwner,
      expect: { status: 200 },
    },
    {
      label: "platform owner dashboard redirects to admin",
      path: "/dashboard?locale=ru",
      session: sessions.platformOwner,
      expect: { redirectIncludes: "/admin?locale=az" },
    },
    {
      label: "shop owner can open staff",
      path: "/staff?locale=ru",
      session: sessions.shopOwner,
      expect: { status: 200 },
    },
    {
      label: "shop owner cannot open platform admin",
      path: "/admin?locale=ru",
      session: sessions.shopOwner,
      expect: { redirectIncludes: "/dashboard?locale=az" },
    },
    {
      label: "branch admin can open finance",
      path: "/finance?locale=ru",
      session: sessions.branchAdmin,
      expect: { status: 200 },
    },
    {
      label: "branch admin cannot open staff management",
      path: "/staff?locale=ru",
      session: sessions.branchAdmin,
      expect: { redirectIncludes: "/dashboard?locale=az" },
    },
    {
      label: "mechanic can open operational dashboard",
      path: "/dashboard?locale=ru",
      session: sessions.mechanic,
      expect: { status: 200 },
    },
    {
      label: "mechanic cannot open finance",
      path: "/finance?locale=ru",
      session: sessions.mechanic,
      expect: { redirectIncludes: "/dashboard?locale=az" },
    },
    {
      label: "mechanic cannot open business settings",
      path: "/settings?locale=ru",
      session: sessions.mechanic,
      expect: { redirectIncludes: "/dashboard?locale=az" },
    },
  ];

  for (const testCase of cases) {
    await runCase(testCase);
  }

  console.log(`Route smoke passed: ${cases.length} checks against ${appUrl}`);
}

async function loadSmokeSessions() {
  return {
    platformOwner: await loadSession(demoAccounts.platformOwner),
    shopOwner: await loadSession(demoAccounts.shopOwner),
    branchAdmin: await loadSession(demoAccounts.branchAdmin),
    mechanic: await loadSession(demoAccounts.mechanic),
  };
}

async function loadSession(email: string): Promise<SmokeSession> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      memberships: {
        where: { isActive: true },
        select: {
          shopId: true,
          shop: {
            select: {
              countryCode: true,
              tenantId: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new Error(`Smoke account missing for role ${emailToRoleLabel(email)}. Run pnpm db:seed first.`);
  }

  if (user.role === "PLATFORM_OWNER") {
    return {
      userId: user.id,
      role: user.role,
      tenantId: "platform",
      shopId: "platform",
      countryCode: "AZ",
    };
  }

  const membership = user.memberships[0];

  if (!membership) {
    throw new Error(`Smoke account has no active membership for role ${emailToRoleLabel(email)}. Run pnpm db:seed first.`);
  }

  return {
    userId: user.id,
    role: user.role,
    tenantId: membership.shop.tenantId,
    shopId: membership.shopId,
    countryCode: membership.shop.countryCode,
  };
}

async function runCase(testCase: SmokeCase) {
  const response = await fetch(new URL(testCase.path, appUrl), {
    headers: testCase.session
      ? {
          Cookie: `${authCookieName}=${createSessionToken(testCase.session)}`,
        }
      : undefined,
    redirect: "manual",
  });

  if (testCase.expect.status !== undefined && response.status !== testCase.expect.status) {
    throw new Error(`${testCase.label}: expected status ${testCase.expect.status}, received ${response.status}`);
  }

  if (testCase.expect.redirectIncludes) {
    const location = response.headers.get("location");

    if (!isRedirectStatus(response.status) || !location?.includes(testCase.expect.redirectIncludes)) {
      throw new Error(
        `${testCase.label}: expected redirect containing ${testCase.expect.redirectIncludes}, received status ${response.status} location ${location ?? "<none>"}`,
      );
    }
  }
}

function createSessionToken(payload: SmokeSession): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 30;
  const encodedPayload = Buffer.from(JSON.stringify({ ...payload, exp: expiresAt }), "utf8").toString("base64url");
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function sign(value: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "oilchanger-local-dev-secret").update(value).digest("base64url");
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

function emailToRoleLabel(email: string): string {
  const entry = Object.entries(demoAccounts).find(([, value]) => safeEqual(value, email));
  return entry?.[0] ?? "unknown";
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
