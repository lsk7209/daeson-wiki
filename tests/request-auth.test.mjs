import assert from "node:assert/strict";
import test from "node:test";

import {
  matchesBearerAuthorization,
  parseBasicAuthorization,
  timingSafeEqual,
} from "../lib/request-auth.ts";

test("parses UTF-8 Basic credentials and keeps colons in passwords", () => {
  const encoded = Buffer.from("사용자:긴:비밀번호", "utf8").toString("base64");
  assert.deepEqual(parseBasicAuthorization(`Basic ${encoded}`), {
    user: "사용자",
    password: "긴:비밀번호",
  });
});

test("rejects malformed authorization headers", () => {
  assert.equal(parseBasicAuthorization(null), null);
  assert.equal(parseBasicAuthorization("Bearer value"), null);
  assert.equal(parseBasicAuthorization("Basic "), null);
  assert.equal(
    parseBasicAuthorization(`Basic ${Buffer.from("missing-separator").toString("base64")}`),
    null,
  );
});

test("matches only the exact Bearer token", () => {
  assert.equal(matchesBearerAuthorization("Bearer secret-value", "secret-value"), true);
  assert.equal(matchesBearerAuthorization("Bearer secret-value-2", "secret-value"), false);
  assert.equal(matchesBearerAuthorization("Basic secret-value", "secret-value"), false);
  assert.equal(matchesBearerAuthorization("Bearer secret-value", ""), false);
});

test("timing-safe comparison handles different lengths", () => {
  assert.equal(timingSafeEqual("same", "same"), true);
  assert.equal(timingSafeEqual("same", "different"), false);
});
