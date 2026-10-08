import { randomUUID } from "node:crypto";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const basePath = "/runmatch";
const testEmail = `runbuddy+clerk_test_${randomUUID()}@example.com`;
const testPassword = `RunBuddy-${randomUUID()}!7a`;
const profileSwitchEmails = [
  `runbuddy+clerk_test_${randomUUID()}@example.com`,
  `runbuddy+clerk_test_${randomUUID()}@example.com`,
  `runbuddy+clerk_test_${randomUUID()}@example.com`,
] as const;
const profileSwitchPassword = `RunBuddy-${randomUUID()}!7a`;

type ClerkApiUser = {
  id: string;
};

async function deleteTemporaryClerkUsers(email = testEmail) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY must be available for E2E user cleanup.");
  }

  const query = new URLSearchParams({
    email_address: email,
    limit: "10",
  });
  const usersResponse = await fetch(
    `https://api.clerk.com/v1/users?${query.toString()}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
    },
  );

  if (!usersResponse.ok) {
    throw new Error(
      `Could not find temporary Clerk test users for cleanup (HTTP ${usersResponse.status}).`,
    );
  }

  const users = (await usersResponse.json()) as ClerkApiUser[];
  for (const user of users) {
    const deleteResponse = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(user.id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secretKey}` },
      },
    );

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      throw new Error(
        `Could not delete a temporary Clerk test user (HTTP ${deleteResponse.status}).`,
      );
    }
  }
}

async function signUpTemporaryUser(page: Page, email: string, password: string) {
  await setupClerkTestingToken({ page });
  await page.goto(`${basePath}/sign-up`);
  await page.locator(".cl-signUp-root").waitFor({ state: "attached" });

  await fillOptionalField(page, 'input[name="firstName"]', "RunBuddy");
  await fillOptionalField(page, 'input[name="lastName"]', "Switch Test");
  await fillOptionalField(
    page,
    'input[name="username"]',
    `rb${randomUUID().replaceAll("-", "").slice(0, 10)}`,
  );
  await page
    .locator('input[name="emailAddress"], input[type="email"]')
    .first()
    .fill(email);

  const passwordField = page.locator('input[name="password"]');
  if (!(await passwordField.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /continue/i }).last().click();
    await passwordField.waitFor({ state: "visible" });
  }
  await passwordField.fill(password);

  const legalAcceptance = page.locator('input[name="legalAccepted"]');
  if (await legalAcceptance.isVisible().catch(() => false)) {
    await legalAcceptance.check();
  }
  await page.getByRole("button", { name: /continue/i }).last().click();

  const verificationCode = page.getByRole("textbox", {
    name: /enter verification code/i,
  });
  try {
    await verificationCode.waitFor({ state: "visible", timeout: 15_000 });
    await verificationCode.pressSequentially("424242");
  } catch {
    // Some development instances complete sign-up without email verification.
  }

  await page.goto(`${basePath}/`);
  await expect(page).toHaveURL(/\/runmatch\/run-buddy\/?$/);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

async function logOutTemporaryUser(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
}

async function fillOptionalField(page: Page, selector: string, value: string) {
  const field = page.locator(selector);
  if (await field.isVisible().catch(() => false)) {
    await field.fill(value);
  }
}

test("Clerk sign-in and sign-out stay inside the non-root RunBuddy path", async ({
  page,
}) => {
  try {
    await setupClerkTestingToken({ page });
    await page.goto(`${basePath}/sign-up`);
    await page.locator(".cl-signUp-root").waitFor({ state: "attached" });

    await fillOptionalField(page, 'input[name="firstName"]', "RunBuddy");
    await fillOptionalField(page, 'input[name="lastName"]', "Test");
    await fillOptionalField(
      page,
      'input[name="username"]',
      `rb${randomUUID().replaceAll("-", "").slice(0, 10)}`,
    );

    const signUpEmail = page
      .locator('input[name="emailAddress"], input[type="email"]')
      .first();
    await signUpEmail.fill(testEmail);

    const signUpPassword = page.locator('input[name="password"]');
    if (!(await signUpPassword.isVisible().catch(() => false))) {
      await page
        .getByRole("button", { name: /continue/i })
        .last()
        .click();
      await signUpPassword.waitFor({ state: "visible" });
    }
    await signUpPassword.fill(testPassword);

    const legalAcceptance = page.locator('input[name="legalAccepted"]');
    if (await legalAcceptance.isVisible().catch(() => false)) {
      await legalAcceptance.check();
    }
    await page
      .getByRole("button", { name: /continue/i })
      .last()
      .click();

    const verificationCode = page.getByRole("textbox", {
      name: /enter verification code/i,
    });
    try {
      await verificationCode.waitFor({ state: "visible", timeout: 15_000 });
      await verificationCode.pressSequentially("424242");
    } catch {
      // Some development instances complete sign-up without email verification.
    }

    await page.goto(`${basePath}/`);
    await expect(page).toHaveURL(/\/runmatch\/run-buddy\/?$/);
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/runmatch\/?$/);
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/runmatch\/sign-in\/?$/);

    const signInEmail = page
      .locator(
        'input[name="identifier"], input[name="emailAddress"], input[type="email"]',
      )
      .first();
    await signInEmail.fill(testEmail);
    await page
      .getByRole("button", { name: /continue/i })
      .last()
      .click();

    const signInPassword = page.locator('input[name="password"]');
    await signInPassword.waitFor({ state: "visible" });
    await signInPassword.fill(testPassword);
    await page
      .getByRole("button", { name: /continue|sign in/i })
      .last()
      .click();

    await expect(page).toHaveURL(/\/runmatch\/run-buddy\/?$/);
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/runmatch\/?$/);
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    const finalPath = new URL(page.url()).pathname;
    expect(finalPath === basePath || finalPath.startsWith(`${basePath}/`)).toBe(
      true,
    );
  } finally {
    await deleteTemporaryClerkUsers();
  }
});

test("website profile navigation follows real Clerk account switches", async ({
  page,
}) => {
  let activeRunnerId: number | null = 14;
  let holdNoProfileResponse = false;
  let resolveNoProfileRequestStarted!: () => void;
  let releaseNoProfileResponse!: () => void;
  const noProfileRequestStarted = new Promise<void>((resolve) => {
    resolveNoProfileRequestStarted = resolve;
  });
  const noProfileResponseGate = new Promise<void>((resolve) => {
    releaseNoProfileResponse = resolve;
  });

  try {
    await page.route("**/api/runners/me", async (route) => {
      if (activeRunnerId === null && holdNoProfileResponse) {
        resolveNoProfileRequestStarted();
        await noProfileResponseGate;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ runnerId: activeRunnerId }),
      });
    });

    await signUpTemporaryUser(
      page,
      profileSwitchEmails[0],
      profileSwitchPassword,
    );
    await expect(page.getByTestId("link-nav-my-profile")).toHaveAttribute(
      "href",
      `${basePath}/runner/14`,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("link-mobile-my-profile")).toHaveAttribute(
      "href",
      `${basePath}/runner/14`,
    );

    await page.setViewportSize({ width: 1280, height: 900 });
    await logOutTemporaryUser(page);
    activeRunnerId = 28;
    await signUpTemporaryUser(
      page,
      profileSwitchEmails[1],
      profileSwitchPassword,
    );
    await expect(page.getByTestId("link-nav-my-profile")).toHaveAttribute(
      "href",
      `${basePath}/runner/28`,
    );
    await expect(page.getByTestId("link-nav-my-profile")).not.toHaveAttribute(
      "href",
      `${basePath}/runner/14`,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("link-mobile-my-profile")).toHaveAttribute(
      "href",
      `${basePath}/runner/28`,
    );
    await expect(
      page.getByTestId("link-mobile-my-profile"),
    ).not.toHaveAttribute("href", `${basePath}/runner/14`);

    await page.setViewportSize({ width: 1280, height: 900 });
    await logOutTemporaryUser(page);
    activeRunnerId = null;
    holdNoProfileResponse = true;
    await signUpTemporaryUser(
      page,
      profileSwitchEmails[2],
      profileSwitchPassword,
    );
    await noProfileRequestStarted;

    await expect(page.getByTestId("link-nav-my-profile")).toHaveCount(0);
    await expect(page.getByTestId("link-nav-create-profile")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("link-mobile-my-profile")).toHaveCount(0);
    await expect(page.getByTestId("link-mobile-create-profile")).toHaveCount(0);

    releaseNoProfileResponse();
    await expect(page.getByTestId("link-mobile-create-profile")).toHaveAttribute(
      "href",
      `${basePath}/create-profile`,
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByTestId("link-nav-create-profile")).toHaveAttribute(
      "href",
      `${basePath}/create-profile`,
    );
    await expect(page.getByTestId("link-nav-my-profile")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("link-mobile-my-profile")).toHaveCount(0);
  } finally {
    releaseNoProfileResponse();
    for (const email of profileSwitchEmails) {
      await deleteTemporaryClerkUsers(email);
    }
  }
});

test("inbox badges show only the active account unread count during account switches", async ({
  page,
}) => {
  const accountEmails = [
    `runbuddy+clerk_test_${randomUUID()}@example.com`,
    `runbuddy+clerk_test_${randomUUID()}@example.com`,
  ];
  const password = `RunBuddy-${randomUUID()}!7a`;
  let activeUnreadCount = 7;
  let holdUnreadResponse = false;
  let resolveUnreadRequestStarted!: () => void;
  let releaseUnreadResponse!: () => void;
  const unreadRequestStarted = new Promise<void>((resolve) => {
    resolveUnreadRequestStarted = resolve;
  });
  const unreadResponseGate = new Promise<void>((resolve) => {
    releaseUnreadResponse = resolve;
  });

  try {
    await page.route("**/api/runners/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ runnerId: 14 }),
      });
    });
    await page.route("**/api/messages/unread-count", async (route) => {
      if (holdUnreadResponse) {
        resolveUnreadRequestStarted();
        await unreadResponseGate;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ count: activeUnreadCount }),
      });
    });

    await signUpTemporaryUser(page, accountEmails[0], password);
    await expect(page.getByTestId("badge-unread-count")).toHaveText("7");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("badge-mobile-unread-count")).toHaveText("7");

    await page.setViewportSize({ width: 1280, height: 900 });
    await logOutTemporaryUser(page);
    activeUnreadCount = 2;
    holdUnreadResponse = true;
    await signUpTemporaryUser(page, accountEmails[1], password);
    await unreadRequestStarted;

    await expect(page.getByTestId("badge-unread-count")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("badge-mobile-unread-count")).toHaveCount(0);

    holdUnreadResponse = false;
    releaseUnreadResponse();
    await expect(page.getByTestId("badge-unread-count")).toHaveText("2");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("badge-mobile-unread-count")).toHaveText("2");
  } finally {
    releaseUnreadResponse();
    for (const email of accountEmails) {
      await deleteTemporaryClerkUsers(email);
    }
  }
});
