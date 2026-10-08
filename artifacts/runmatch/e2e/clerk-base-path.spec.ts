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
  `runbuddy+clerk_test_${randomUUID()}@example.com`,
] as const;
const profileSwitchPassword = `RunBuddy-${randomUUID()}!7a`;
const lateProfileSwitchEmails = [
  `runbuddy+clerk_test_${randomUUID()}@example.com`,
  `runbuddy+clerk_test_${randomUUID()}@example.com`,
] as const;

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

async function signInTemporaryUser(page: Page, email: string, password: string) {
  await setupClerkTestingToken({ page });
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/runmatch\/sign-in\/?$/);

  const signInEmail = page
    .locator(
      'input[name="identifier"], input[name="emailAddress"], input[type="email"]',
    )
    .first();
  await signInEmail.fill(email);
  await page.getByRole("button", { name: /continue/i }).last().click();

  const signInPassword = page.locator('input[name="password"]');
  await signInPassword.waitFor({ state: "visible" });
  await signInPassword.fill(password);
  await page
    .getByRole("button", { name: /continue|sign in/i })
    .last()
    .click();

  await expect(page).toHaveURL(/\/runmatch\/run-buddy\/?$/);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
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
  let failRunnerLookupOnce = false;
  let failedRunnerLookupCount = 0;
  let resolveNoProfileRequestStarted!: () => void;
  let releaseNoProfileResponse!: () => void;
  let resolveRunnerRecoveryRequestStarted!: () => void;
  let releaseRunnerRecoveryResponse!: () => void;
  const noProfileRequestStarted = new Promise<void>((resolve) => {
    resolveNoProfileRequestStarted = resolve;
  });
  const noProfileResponseGate = new Promise<void>((resolve) => {
    releaseNoProfileResponse = resolve;
  });
  const runnerRecoveryRequestStarted = new Promise<void>((resolve) => {
    resolveRunnerRecoveryRequestStarted = resolve;
  });
  const runnerRecoveryResponseGate = new Promise<void>((resolve) => {
    releaseRunnerRecoveryResponse = resolve;
  });

  try {
    await page.route("**/api/runners/me", async (route) => {
      if (failRunnerLookupOnce) {
        failedRunnerLookupCount += 1;
        if (failedRunnerLookupCount === 1) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Temporary lookup failure" }),
          });
          return;
        }
        resolveRunnerRecoveryRequestStarted();
        await runnerRecoveryResponseGate;
      }
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

    await page.setViewportSize({ width: 1280, height: 900 });
    await logOutTemporaryUser(page);
    activeRunnerId = 42;
    failRunnerLookupOnce = true;
    failedRunnerLookupCount = 0;
    await signUpTemporaryUser(
      page,
      profileSwitchEmails[3],
      profileSwitchPassword,
    );
    await runnerRecoveryRequestStarted;
    expect(failedRunnerLookupCount).toBe(2);

    await expect(page.getByTestId("link-nav-my-profile")).toHaveCount(0);
    await expect(page.getByTestId("link-nav-create-profile")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("link-mobile-my-profile")).toHaveCount(0);
    await expect(page.getByTestId("link-mobile-create-profile")).toHaveCount(0);

    releaseRunnerRecoveryResponse();
    await expect(page.getByTestId("link-mobile-my-profile")).toHaveAttribute(
      "href",
      `${basePath}/runner/42`,
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByTestId("link-nav-my-profile")).toHaveAttribute(
      "href",
      `${basePath}/runner/42`,
    );
  } finally {
    releaseNoProfileResponse();
    releaseRunnerRecoveryResponse();
    for (const email of profileSwitchEmails) {
      await deleteTemporaryClerkUsers(email);
    }
  }
});

test("late current-runner responses cannot restore a previous account's profile links", async ({
  page,
}) => {
  let activeRunnerId: number | null = 14;
  let holdAccountARunnerResponse = false;
  let resolveLateRunnerRequestStarted!: () => void;
  let releaseLateRunnerResponse!: () => void;
  let resolveLateRunnerResponseCompleted!: () => void;
  const lateRunnerRequestStarted = new Promise<void>((resolve) => {
    resolveLateRunnerRequestStarted = resolve;
  });
  const lateRunnerResponseGate = new Promise<void>((resolve) => {
    releaseLateRunnerResponse = resolve;
  });
  const lateRunnerResponseCompleted = new Promise<void>((resolve) => {
    resolveLateRunnerResponseCompleted = resolve;
  });

  try {
    await page.route("**/api/runners/me", async (route) => {
      if (holdAccountARunnerResponse) {
        holdAccountARunnerResponse = false;
        const accountARunnerId = activeRunnerId;
        resolveLateRunnerRequestStarted();
        await lateRunnerResponseGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Cache-Control": "no-store" },
          body: JSON.stringify({ runnerId: accountARunnerId }),
        });
        resolveLateRunnerResponseCompleted();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ runnerId: activeRunnerId }),
      });
    });

    activeRunnerId = 28;
    await signUpTemporaryUser(
      page,
      lateProfileSwitchEmails[1],
      profileSwitchPassword,
    );
    await logOutTemporaryUser(page);

    activeRunnerId = 14;
    holdAccountARunnerResponse = true;
    await signUpTemporaryUser(
      page,
      lateProfileSwitchEmails[0],
      profileSwitchPassword,
    );
    await lateRunnerRequestStarted;
    await logOutTemporaryUser(page);

    activeRunnerId = 28;
    await signInTemporaryUser(
      page,
      lateProfileSwitchEmails[1],
      profileSwitchPassword,
    );
    await expect(page.getByTestId("link-nav-my-profile")).toHaveAttribute(
      "href",
      `${basePath}/runner/28`,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("link-mobile-my-profile")).toHaveAttribute(
      "href",
      `${basePath}/runner/28`,
    );

    releaseLateRunnerResponse();
    await lateRunnerResponseCompleted;

    await expect(page.getByTestId("link-mobile-my-profile")).toHaveAttribute(
      "href",
      `${basePath}/runner/28`,
    );
    await expect(
      page.getByTestId("link-mobile-my-profile"),
    ).not.toHaveAttribute("href", `${basePath}/runner/14`);

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByTestId("link-nav-my-profile")).toHaveAttribute(
      "href",
      `${basePath}/runner/28`,
    );
    await expect(page.getByTestId("link-nav-my-profile")).not.toHaveAttribute(
      "href",
      `${basePath}/runner/14`,
    );
  } finally {
    releaseLateRunnerResponse();
    for (const email of lateProfileSwitchEmails) {
      await deleteTemporaryClerkUsers(email);
    }
  }
});

test("open conversations hide previous account messages after a cross-tab account switch", async ({
  page,
}) => {
  const accountEmails = [
    `runbuddy+clerk_test_${randomUUID()}@example.com`,
    `runbuddy+clerk_test_${randomUUID()}@example.com`,
  ];
  const secondTab = await page.context().newPage();
  const password = `RunBuddy-${randomUUID()}!7a`;
  let activeRunnerId = 14;
  let holdLateFirstAccountConversation = false;
  let lateFirstAccountConversationStarted = false;
  let resolveLateFirstAccountConversationStarted!: () => void;
  let releaseLateFirstAccountConversation!: () => void;
  let resolveLateFirstAccountConversationCompleted!: () => void;
  let holdSecondAccountConversation = false;
  let resolveSecondAccountConversationStarted!: () => void;
  let releaseSecondAccountConversation!: () => void;
  const lateFirstAccountConversationStartedPromise = new Promise<void>((resolve) => {
    resolveLateFirstAccountConversationStarted = resolve;
  });
  const lateFirstAccountConversationGate = new Promise<void>((resolve) => {
    releaseLateFirstAccountConversation = resolve;
  });
  const lateFirstAccountConversationCompleted = new Promise<void>((resolve) => {
    resolveLateFirstAccountConversationCompleted = resolve;
  });
  const secondAccountConversationStarted = new Promise<void>((resolve) => {
    resolveSecondAccountConversationStarted = resolve;
  });
  const secondAccountConversationGate = new Promise<void>((resolve) => {
    releaseSecondAccountConversation = resolve;
  });
  const firstAccountMessage = "Private message for the first account";
  const secondAccountMessage = "Conversation for the second account";

  try {
    await page.context().route("**/api/runners/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ runnerId: activeRunnerId }),
      });
    });
    await page.context().route("**/api/messages/conversation**", async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("otherId") !== "15") {
        await route.continue();
        return;
      }

      const requestRunnerId = activeRunnerId;
      const isLateFirstAccountConversation =
        requestRunnerId === 14 && holdLateFirstAccountConversation;
      if (isLateFirstAccountConversation) {
        holdLateFirstAccountConversation = false;
        lateFirstAccountConversationStarted = true;
        resolveLateFirstAccountConversationStarted();
        await lateFirstAccountConversationGate;
      }

      if (requestRunnerId === 28 && holdSecondAccountConversation) {
        resolveSecondAccountConversationStarted();
        await secondAccountConversationGate;
      }

      const message =
        requestRunnerId === 14
          ? firstAccountMessage
          : secondAccountMessage;
      try {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Cache-Control": "no-store" },
          body: JSON.stringify([
            {
              id: requestRunnerId,
              fromRunnerId: requestRunnerId,
              toRunnerId: 15,
              content: message,
              isRead: false,
              createdAt: new Date().toISOString(),
            },
          ]),
        });
      } catch (error) {
        const errorText = error instanceof Error ? error.message : String(error);
        const requestFailure =
          route.request().failure()?.toLowerCase() ?? "";
        const wasAborted =
          /abort|cancel/i.test(errorText) || /abort|cancel/i.test(requestFailure);
        if (!isLateFirstAccountConversation || !wasAborted) {
          throw error;
        }
      } finally {
        if (isLateFirstAccountConversation) {
          resolveLateFirstAccountConversationCompleted();
        }
      }
    });

    await signUpTemporaryUser(page, accountEmails[0], password);
    await setupClerkTestingToken({ page: secondTab });
    await secondTab.goto(`${basePath}/messages/15`);
    await expect(secondTab.getByText(firstAccountMessage)).toBeVisible();

    holdLateFirstAccountConversation = true;
    await secondTab.reload();
    await lateFirstAccountConversationStartedPromise;
    await expect(secondTab.getByText(firstAccountMessage)).toHaveCount(0);

    await logOutTemporaryUser(page);
    await expect(secondTab.getByRole("link", { name: "Sign in" })).toBeVisible();
    activeRunnerId = 28;
    holdSecondAccountConversation = true;
    await signUpTemporaryUser(page, accountEmails[1], password);

    await secondAccountConversationStarted;
    await expect(secondTab.getByText(firstAccountMessage)).toHaveCount(0);

    holdSecondAccountConversation = false;
    releaseSecondAccountConversation();
    await expect(secondTab.getByText(secondAccountMessage)).toBeVisible();
    await expect(secondTab.getByText(firstAccountMessage)).toHaveCount(0);

    releaseLateFirstAccountConversation();
    await lateFirstAccountConversationCompleted;
    await expect(secondTab.getByText(secondAccountMessage)).toBeVisible();
    await expect(secondTab.getByText(firstAccountMessage)).toHaveCount(0);
  } finally {
    releaseLateFirstAccountConversation();
    releaseSecondAccountConversation();
    if (lateFirstAccountConversationStarted) {
      await lateFirstAccountConversationCompleted;
    }
    await secondTab.close();
    for (const email of accountEmails) {
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
  const secondTab = await page.context().newPage();
  const password = `RunBuddy-${randomUUID()}!7a`;
  let activeUnreadCount = 7;
  let holdUnreadResponse = false;
  let heldUnreadRequestCount = 0;
  let resolveUnreadRequestStarted!: () => void;
  let releaseUnreadResponse!: () => void;
  let resolveBothUnreadRequestsStarted!: () => void;
  const unreadRequestStarted = new Promise<void>((resolve) => {
    resolveUnreadRequestStarted = resolve;
  });
  const bothUnreadRequestsStarted = new Promise<void>((resolve) => {
    resolveBothUnreadRequestsStarted = resolve;
  });
  const unreadResponseGate = new Promise<void>((resolve) => {
    releaseUnreadResponse = resolve;
  });

  try {
    await page.context().route("**/api/runners/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ runnerId: 14 }),
      });
    });
    await page.context().route("**/api/messages/unread-count", async (route) => {
      if (holdUnreadResponse) {
        heldUnreadRequestCount += 1;
        resolveUnreadRequestStarted();
        if (heldUnreadRequestCount >= 2) {
          resolveBothUnreadRequestsStarted();
        }
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

    await setupClerkTestingToken({ page: secondTab });
    await secondTab.setViewportSize({ width: 390, height: 844 });
    await secondTab.goto(`${basePath}/run-buddy`);
    await expect(secondTab.getByTestId("badge-mobile-unread-count")).toHaveText(
      "7",
    );

    await logOutTemporaryUser(page);
    await expect(secondTab.getByRole("link", { name: "Sign in" })).toBeVisible();
    activeUnreadCount = 2;
    holdUnreadResponse = true;
    await signUpTemporaryUser(page, accountEmails[1], password);
    await unreadRequestStarted;
    await expect(secondTab.getByTestId("button-mobile-logout")).toBeVisible();
    await bothUnreadRequestsStarted;

    await expect(page.getByTestId("badge-unread-count")).toHaveCount(0);
    await expect(secondTab.getByTestId("badge-mobile-unread-count")).toHaveCount(
      0,
    );

    holdUnreadResponse = false;
    releaseUnreadResponse();
    await expect(page.getByTestId("badge-unread-count")).toHaveText("2");
    await expect(secondTab.getByTestId("badge-mobile-unread-count")).toHaveText(
      "2",
    );
  } finally {
    releaseUnreadResponse();
    await secondTab.close();
    for (const email of accountEmails) {
      await deleteTemporaryClerkUsers(email);
    }
  }
});

test("desktop and mobile inbox badges recover after a temporary unread-count failure", async ({
  page,
}) => {
  const email = `runbuddy+clerk_test_${randomUUID()}@example.com`;
  const password = `RunBuddy-${randomUUID()}!7a`;
  let unreadCount = 1;
  let failNextUnreadCountRequest = false;
  let failedUnreadCountResponseCount = 0;
  let unreadCountTwoResponseCount = 0;

  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.context().route("**/api/runners/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ runnerId: 14 }),
      });
    });
    await page
      .context()
      .route("**/api/messages/unread-count", async (route) => {
        if (failNextUnreadCountRequest) {
          failNextUnreadCountRequest = false;
          failedUnreadCountResponseCount += 1;
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            headers: { "Cache-Control": "no-store" },
            body: JSON.stringify({ error: "Temporary unread-count outage" }),
          });
          return;
        }

        if (unreadCount === 2) {
          unreadCountTwoResponseCount += 1;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Cache-Control": "no-store" },
          body: JSON.stringify({ count: unreadCount }),
        });
      });

    await signUpTemporaryUser(page, email, password);
    const desktopBadge = page.getByTestId("badge-unread-count");
    const mobileBadge = page.getByTestId("badge-mobile-unread-count");
    await expect(desktopBadge).toBeVisible();
    await expect(desktopBadge).toHaveText("1");
    const documentTimeOrigin = await page.evaluate(
      () => performance.timeOrigin,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(mobileBadge).toBeVisible();
    await expect(mobileBadge).toHaveText("1");

    await page.setViewportSize({ width: 1280, height: 900 });
    unreadCount = 2;
    failNextUnreadCountRequest = true;
    await expect
      .poll(() => failedUnreadCountResponseCount, { timeout: 20_000 })
      .toBe(1);
    await expect
      .poll(() => unreadCountTwoResponseCount, { timeout: 20_000 })
      .toBeGreaterThan(0);
    await expect(desktopBadge).toBeVisible();
    await expect(desktopBadge).toHaveText("2");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(mobileBadge).toBeVisible();
    await expect(mobileBadge).toHaveText("2");
    await expect
      .poll(() => page.evaluate(() => performance.timeOrigin))
      .toBe(documentTimeOrigin);
  } finally {
    await deleteTemporaryClerkUsers(email);
  }
});
