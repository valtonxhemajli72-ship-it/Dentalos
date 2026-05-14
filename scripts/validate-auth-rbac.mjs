import assert from "node:assert/strict";
import {
  assertPermission,
  getPermissionsForRole,
  PermissionDeniedError,
  roleHasPermission,
} from "../src/server/auth/permissions.ts";

assert.equal(roleHasPermission("OWNER", "user:manage"), true);
assert.equal(roleHasPermission("OWNER", "membership:deactivate"), true);
assert.equal(roleHasPermission("ADMIN", "patient:import"), true);
assert.equal(roleHasPermission("ADMIN", "invitation:create"), true);
assert.equal(roleHasPermission("ADMIN", "membership:update"), true);
assert.equal(roleHasPermission("DOCTOR", "patient:import"), false);
assert.equal(roleHasPermission("DOCTOR", "user:manage"), false);
assert.equal(roleHasPermission("RECEPTIONIST", "patient:import"), true);
assert.equal(roleHasPermission("MANAGER", "audit:read"), true);
assert.equal(roleHasPermission("MANAGER", "user:read"), true);
assert.equal(roleHasPermission("MANAGER", "invitation:create"), false);
assert.equal(roleHasPermission("STAFF", "billing:read"), false);
assert.equal(roleHasPermission("STAFF", "tenant:switch"), true);
assert.equal(roleHasPermission("CLINICIAN", "patient:update"), true);

assert.doesNotThrow(() => assertPermission("RECEPTIONIST", "patient:import"));
assert.throws(() => assertPermission("STAFF", "settings:update"), PermissionDeniedError);

for (const role of ["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", "MANAGER", "STAFF"]) {
  assert.ok(getPermissionsForRole(role).length > 0, `${role} must have explicit permissions`);
}

console.log("Auth RBAC validation passed.");
