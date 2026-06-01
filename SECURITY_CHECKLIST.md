# CycleOps Security Checklist (Free / Low-Cost)

This document outlines practical, zero or near-zero cost steps to improve the security of the CycleOps application.

## Current State (as of last audit)

- Row Level Security (RLS) is **disabled** on Supabase.
- All database operations use the **anonymous key** from the frontend.
- Passwords are now **hashed** with bcryptjs (good).
- Writes are still performed directly from the browser (major remaining risk).
- The app is intended for a single-day internal military event (~40 participants).

---

## Priority Security Improvements

### High Priority (Do These First)

| # | Item | Status | Effort | Impact | Recommendation |
|---|------|--------|--------|--------|----------------|
| 1 | **Hash all passwords** | ✅ Done | Low | High | Completed with bcryptjs |
| 2 | **Move all writes to server-side** (Next.js API Routes / Server Actions) using `service_role` key | ⬜ Pending | Medium | Very High | **Strongly recommended** |
| 3 | **Add basic rate limiting** on write endpoints | ⬜ Pending | Low | Medium | Prevents abuse |
| 4 | **Remove or minimize sensitive data exposure** in client reads | ⬜ Pending | Low-Medium | Medium | e.g. don't expose emergency contacts to all users |

### Medium Priority

| # | Item | Status | Effort | Impact | Recommendation |
|---|------|--------|--------|--------|----------------|
| 5 | Enable **Row Level Security (RLS)** with basic policies | ⬜ Pending | Medium-High | High | Long-term goal |
| 6 | Add audit logging for admin actions (manual scores, jerrican) | ⬜ Pending | Medium | Medium | Useful for post-event review |
| 7 | Consider adding a simple shared event code (in addition to Name + Password) | ⬜ Pending | Low | Low-Medium | Reduces casual unauthorized access |
| 8 | Review and minimize what data the anon key can read | ⬜ Pending | Low | Medium | Use Supabase views or RLS later |

### Low Priority / Nice to Have

- Add Content Security Policy (CSP) headers
- Enable Supabase Auth (magic links or simple email/password) instead of custom Name+Password
- Regular database backups + point-in-time recovery testing
- Security headers on Vercel (already partially available)

---

## Recommended Immediate Next Steps (Free)

1. **Implement server-side writes** (biggest remaining win)
   - Move `safeInsert` / `safeUpsert` calls for sensitive operations to API routes.
   - Use the `service_role` key **only on the server**.

2. Add simple rate limiting middleware on those routes (can be done with a small in-memory or Vercel KV solution).

3. Once server-side writes are in place, gradually introduce RLS policies.

---

## Notes Specific to This Event

- Because this is a **one-day, closed-group event**, perfect security is less critical than for a public app.
- However, because it is a **military unit**, data integrity (scores, check-ins, jerrican results) and confidentiality (personal/medical info) still matter.
- The current biggest practical risk is **data tampering** by someone who obtains the Supabase anon key (easy to extract from the frontend).

---

**Last Updated:** June 2026
**Owner:** CycleOps Team
