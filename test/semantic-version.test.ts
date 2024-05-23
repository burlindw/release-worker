import { test, expect } from "vitest";
import assert from "node:assert";
import { SemanticVersion } from "../src/semantic-version";

test.each<string>([
  "",
  "0",
  "0.0",
  "0.0.",
  "0.0-dev",
  "1.0.0-dav.1+aaaaaaaaa",
  "1.0.0+dev.1+aaaaaaaaa",
  "1.0.0-dev.bob+aaaaaaaaa",
])("valid %s? -> %j", (versionString) => {
  const version = SemanticVersion.parse(versionString);
  expect(version).toBeNull();
});

test.each<string>([
  "0.0.0",
  "0.0.0-dev",
  // TODO reject these versions
  "1.0.0-dev+aaaaaaaaa",
  "1.0.0-dev.1+aaaaaaaaa",
  "1.0.0-dev.1-aaaaaaaaa",
  "1.0.0-dev.1",
  "1.0.0-dev",
])("valid %s", (versionString) => {
  const version = SemanticVersion.parse(versionString);
  expect(version).toBeTruthy();
});

test.each<[string, "<" | "=" | ">", string]>([
  ["0.0.0", "<", "1.0.0"],
  ["1.0.0", "=", "1.0.0"],
  ["1.0.0", ">", "0.0.0"],

  ["0.0.0", "<", "0.1.0"],
  ["0.1.0", "=", "0.1.0"],
  ["0.1.0", ">", "0.0.0"],

  ["0.0.0", "<", "0.0.1"],
  ["0.0.1", "=", "0.0.1"],
  ["0.0.1", ">", "0.0.0"],

  ["1.0.0-dev", "=", "1.0.0-dev"],

  ["1.0.0-dev", "=", "1.0.0-dev.1+aaaaaaaaa"],
  ["1.0.0-dev.1+aaaaaaaaa", "=", "1.0.0-dev"],

  ["1.0.0-dev.0+aaaaaaaaa", "<", "1.0.0-dev.1+aaaaaaaaa"],
  ["1.0.0-dev.1+aaaaaaaaa", "=", "1.0.0-dev.1+aaaaaaaaa"],
  ["1.0.0-dev.1+aaaaaaaaa", ">", "1.0.0-dev.0+aaaaaaaaa"],

  ["1.0.0-dev.1+aaaaaaaaa", "=", "1.0.0-dev.1+bbbbbbbbb"],
])("order %s %s %s", (lhsString, order, rhsString) => {
  const lhsVersion = SemanticVersion.parse(lhsString);
  assert(lhsVersion !== null);
  const rhsVersion = SemanticVersion.parse(rhsString);
  assert(rhsVersion !== null);

  const actualOrder = SemanticVersion.order(lhsVersion, rhsVersion);
  let expectedOrder: 1 | 0 | -1;
  switch (order) {
    case "<":
      expectedOrder = -1;
      break;
    case "=":
      expectedOrder = 0;
      break;
    case ">":
      expectedOrder = 1;
      break;
  }
  expect(actualOrder).toBe(expectedOrder);
});
