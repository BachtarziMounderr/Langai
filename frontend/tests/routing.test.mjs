import assert from "node:assert/strict";
import test from "node:test";
import { resolveWorkspace } from "../src/lib/auth/routing.ts";

function context(id, route) {
  return { id, route };
}

test("single role admits only its workspace", () => {
  for (const [role, route] of [
    ["STUDENT", "/student"], ["TEACHER", "/teacher"],
    ["SCHOOL_ADMIN", "/admin"], ["SUPER_ADMIN", "/super-admin"],
  ]) {
    const choices = [context(role, route)];
    assert.equal(resolveWorkspace(choices, undefined, route).status, "ok");
    for (const other of ["/student", "/teacher", "/admin", "/super-admin"]) {
      if (other !== route) assert.equal(resolveWorkspace(choices, undefined, other).status, "forbidden");
    }
  }
});

test("multi-school roles never merge", () => {
  const choices = [context("school-a:TEACHER", "/teacher"), context("school-b:SCHOOL_ADMIN", "/admin")];
  assert.equal(resolveWorkspace(choices, undefined, "/teacher").status, "select");
  assert.equal(resolveWorkspace(choices, "school-a:TEACHER", "/teacher").status, "ok");
  assert.equal(resolveWorkspace(choices, "school-a:TEACHER", "/admin").status, "forbidden");
  assert.equal(resolveWorkspace(choices, "school-b:SCHOOL_ADMIN", "/admin").status, "ok");
  assert.equal(resolveWorkspace(choices, "unknown", "/admin").status, "select");
});

test("no active membership gives no workspace", () => {
  assert.equal(resolveWorkspace([], undefined, "/student").status, "none");
});
