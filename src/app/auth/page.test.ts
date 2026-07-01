import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("auth signup page", () => {
  it("does not require an invite code for public client signup", () => {
    const source = readFileSync(join(process.cwd(), "src/app/auth/page.tsx"), "utf8")

    expect(source).not.toContain('name="inviteCode"')
    expect(source).not.toContain("Invite code")
    expect(source).toContain("create your client account")
  })
})
