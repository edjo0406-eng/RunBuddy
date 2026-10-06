import { randomUUID } from "node:crypto";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const basePath = "/runmatch";
const testEmail = `runbuddy+clerk_test_${randomUUID()}@example.com`;
const testPassword = `RunBuddy-${randomUUID()}!7a`;

type ClerkApiUser = {
  id: string;
};

async function deleteTemporaryClerkUsers() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY must be available for E2E user cleanup.");
  }

  const query = new URLSearchParams({
    email_address: testEmail,
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
