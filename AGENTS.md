# Production and review gates

- `main` is production. Perform implementation on a `codex/` review branch or isolated worktree, never on the main checkout while it is on `main`.
- Requirements approval, test-report approval, code-diff approval, integration approval, and deployment approval are separate decisions. Approval of one does not approve the others.
- An ambiguous approval must not authorize integration or deployment. Ask which gate it applies to before changing production state.
- Do not merge, cherry-pick, copy implementation files into a production checkout, push to `main`, or deploy without explicit authorization for that action after code review.
- Preserve reviewable changes when approval is pending. Do not back out changes without the user's instruction.
- Keep the work board accurate. Record which artifact was approved; never mark code approved from test-report approval.
