import { expect, it } from "vitest";

it("temporary CI verification fails intentionally", () => {
  expect("intentional failure").toBe("pass");
});
