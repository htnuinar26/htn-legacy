# AGENTS.md - HTN Legacy

## Project Scope

HTN Legacy adalah aplikasi internal untuk pencatatan iuran bulanan, receipt pembayaran, kas organisasi, laporan, dan audit log, dengan dua peran: Anggota dan Admin/Bendahara. Lihat `PRD.md`, `SPEC.md`, `ARCHITECTURE.md`, dan `DESIGN.md` untuk spesifikasi penuh; dokumen ini mengatur bagaimana agent coding bekerja di repository ini.

Ini adalah pembangunan ulang dari nol. Repository lama (`htn-legacy` versi sebelumnya) ditinggalkan karena dua kelas bug berulang: validasi nominal yang menolak angka wajar, dan error 500 generik tanpa detail yang bisa ditindaklanjuti. Setiap keputusan di bawah ini ada untuk mencegah kelas bug itu terulang, bukan sekadar preferensi gaya.

## Current Receipt Architecture

- Upload receipt anggota dicatat di PostgreSQL Neon lewat Prisma; file disimpan di Supabase Storage, database hanya menyimpan path object.
- Receipt yang diupload masuk status `PENDING`.
- Admin/Bendahara meninjau manual dan memilih `APPROVED` atau `REJECTED`.
- Receipt manual yang dibuat Admin (Receipt Generator) langsung tercatat `APPROVED`, dengan transaksi `MASUK` yang dibuat atomik dalam transaksi database yang sama.
- Verifikasi receipt tidak memakai OCR, Gemini, atau service pembaca gambar otomatis apapun.
- Jangan memasukkan kembali OCR, Gemini, auto-rejection otomatis, atau environment variable terkait ekstraksi gambar kecuali pemilik produk secara eksplisit meminta keputusan arsitektur baru.

## Standar Input Nominal (Wajib, Tanpa Pengecualian)

Ini adalah perbaikan langsung dari bug yang pernah terjadi: field nominal menolak angka wajar seperti `10000` karena memakai `<input type="number">` dengan `step` yang salah.

- Setiap field yang menerima nilai uang **wajib** memakai komponen bersama `src/components/ui/rupiah-input.tsx`. Jangan membuat field nominal baru di luar komponen ini, di form manapun.
- Elemen dasar komponen ini **wajib** `<input type="text" inputMode="numeric" pattern="[0-9]*">`. **Dilarang keras** `<input type="number">` untuk nominal uang di manapun dalam codebase ini.
- Jangan menambahkan `step`, `min`, atau `max` dalam bentuk atribut HTML native pada input nominal. Batas bisnis (misal "harus lebih dari 0") divalidasi lewat Zod di server dan ditampilkan sebagai pesan error di bawah field.
- Detail spesifikasi penuh komponen ada di `SPEC.md` bagian "Komponen Bersama Wajib".
- Sebelum mengubah logic input nominal manapun, cari seluruh codebase untuk setiap pemakaian `RupiahInput` dan setiap kemungkinan `<input type="number">` yang luput, laporkan semua lokasi yang ditemukan sebelum melakukan perubahan.

## Standar Error Handling API (Wajib, Tanpa Pengecualian)

Ini adalah perbaikan langsung dari bug yang pernah terjadi: endpoint `/api/admin/struk-generator` mengembalikan 500 generik tanpa detail yang bisa ditelusuri.

- Setiap Route Handler di `src/app/api/**` wajib memakai helper `apiSuccess()`/`apiError()` dari `src/lib/api-response.ts`. Jangan membuat bentuk response error sendiri.
- Setiap kegagalan diklasifikasikan ke salah satu kategori yang terdaftar di `ARCHITECTURE.md` (`VALIDATION_ERROR`, `AUTH_ERROR`, `NOT_FOUND`, `CONFLICT`, `STORAGE_ERROR`, `DATABASE_ERROR`, `INTERNAL_ERROR`). Jangan pernah mengembalikan error tanpa kategori atau membiarkan exception jatuh ke generic error handler Next.js tanpa ditangkap.
- Pesan error ke client selalu spesifik dan dalam Bahasa Indonesia, menjelaskan apa yang gagal. Dilarang pesan generik seperti "Terjadi kesalahan" atau "Gagal membuat struk manual" tanpa konteks tambahan.
- Setiap error kategori `STORAGE_ERROR`, `DATABASE_ERROR`, dan `INTERNAL_ERROR` wajib dicatat di server log dengan `requestId`, endpoint, kategori, dan detail error asli.
- Saat menambah endpoint baru atau mengubah endpoint lama, verifikasi checklist regresi di `SPEC.md` bagian "Checklist Regresi Wajib" sebelum melaporkan pekerjaan selesai.

## Language Style

- Respond only in Indonesian (Bahasa Indonesia) for all outputs.
- Use "Saya" to refer to yourself (not "Aku" or "Gue").
- Use "Anda" to refer to the user (not "Kamu").
- Tone should be formal but leaning casual, not stiff.

## WhatsApp Policy

- WhatsApp notifications use manually opened `wa.me` links.
- Do not add WAHA, WhatsApp sessions, webhooks, background WhatsApp services, or 24/7 WhatsApp infrastructure.

## Architecture Rules

- Keep Admin and Anggota authorization separate; every Admin-only route and Route Handler must check `isAdmin()` explicitly, never infer admin status from the presence of an admin-shaped payload.
- Keep receipt metadata in PostgreSQL and receipt files behind the Supabase Storage boundary; never read image content server-side for automated decisions.
- Preserve the distinction between cyclical member payment status (`LUNAS`/`BELUM_LUNAS`/`TERTUNGGAK`) and permanent transaction history (`Transaksi`).
- Monthly reset must not delete historical `Transaksi` records.
- Receipt creation (manual or member-submitted) and its related cash transaction must remain atomic through a single database transaction, with the isolation level specified in `SPEC.md` for the Receipt Generator path.
- Do not change or delete existing member, receipt, transaction, or storage data without explicit user approval.
- Follow the mermaid flows in `ARCHITECTURE.md` exactly for receipt upload, receipt generator, and cash deletion; if an implementation detail is ambiguous against those diagrams, ask before deviating.

## UI/Component Change Rules

- Before changing any UI component (sidebar, header, modal, navigation, status badge, or any shared visual element), search the entire codebase for every location where that component is used or rendered. Do not stop after finding the first match.
- Check whether the component is genuinely shared or duplicated across the Anggota shell and the Admin shell. Never assume one or the other without checking.
- If the same component is found duplicated instead of shared, report this to the user as a potential technical debt issue before making any edit. Do not silently refactor it into a shared component and do not silently leave the duplication as-is.
- After the change is implemented, list every file affected by the change in the final report, in addition to what Delivery Rules already requires.
- Every new or changed UI surface must follow `DESIGN.md`: token architecture (primitive/semantic/component), the minimalist editorial direction, `lucide-react` for functional icons, Bootstrap Icons only for social-media brand marks, and the accessibility rules (contrast, touch target, aria-label) listed there.

## Ambiguity & Clarification Rules

- If an instruction references an icon, visual asset, or UI element without naming a specific source (an icon library, a specific file, or a visual reference), ask for clarification before making any change. Never assume a default representation (e.g. a plain text character instead of an icon glyph).
- If an instruction can reasonably be interpreted in more than one way, regarding scope (which pages/routes are affected), location (which file/component), or implementation approach, ask a clarifying question before executing.
- Do not propose "better" alternatives, design suggestions, or additional improvements beyond what was explicitly requested, unless the user explicitly asks for recommendations.
- When uncertain whether to ask or to proceed, default to asking.

## Documentation Rules

- `ARCHITECTURE.md`, `PRD.md`, `SPEC.md`, and `DESIGN.md` at the repository root are the current documentation source.
- The receipt flow must describe manual Admin/Bendahara verification only.
- Do not restore obsolete OCR/Gemini terminology in documentation, source comments, environment examples, or prompts.
- Update relevant documentation when route behavior, authorization, data lifecycle, or deployment requirements change.

## Development Rules

- Use the existing project conventions and preserve unrelated working-tree changes.
- Inspect `git status` before editing and never overwrite user changes.
- Use `apply_patch` for focused edits.
- When implementing frontend UI, pages, layouts, or visual interactions, always read and use `.opencode/.skills/frontend-design/SKILL.md` before editing, in addition to `DESIGN.md`.
- When creating or managing GitHub Issues, Pull Requests, branches, or project workflow, always read and use `.opencode/.skills/github-project-management/SKILL.md` before acting.
- Required skills must be read completely before execution, and their applicable instructions must be followed throughout the task.
- Preserve valid UTF-8 encoding in every file. Do not produce broken encoding, replacement characters, or mojibake.
- Never use the em-dash character (Unicode `U+2014`) in any file, including source code, UI copy, documentation, and comments.
- Before committing, scan all changed files for broken encoding and em-dash characters.
- Do not commit `.env`, secrets, generated logs, build output, or local tool artifacts.
- Before committing, run the narrowest relevant validation, normally:

```bash
bunx tsc --noEmit
bun run lint
bun run build
```

- For schema changes, verify the appropriate Prisma migration strategy before running any database command.
- Never run `prisma db reset`, `bun run db:reset`, or destructive cleanup commands without explicit approval.

### Toolchain and Side-Effect Rules

These rules exist because a past session ran a dependency-generating command to obtain an accurate TypeScript baseline. That command silently installed packages, bumped a dependency version in `package.json`, and created a conflicting lockfile. The mistake was caught and reverted, but the underlying habit is the problem, not the one command.

- The only lockfile in this repository is `bun.lock`. Never run `npm install`, never run `npx <package>`, and never create a `package-lock.json`. Use `bun install` and `bun run <script>`.
- Before running any command that can install, generate, or update dependencies, state which tracked files it may modify. Commands that do this include `prisma generate`, installers, and any script that copies or rewrites assets.
- After running such a command, always run `git status` and `git diff` to confirm no tracked file changed unexpectedly.
- If such a command changes a tracked file outside the scope of the current task, restore that file with `git checkout -- <file>` and delete any untracked artifact it created. Never carry the side effect into the current task.
- When a side effect is reverted, report it plainly, including which files were touched and how they were restored.

### Changelog and Parallel Branch Rules

These rules exist to prevent repeated merge conflicts when multiple Pull Requests touch `CHANGELOG.md` at the same time.

- Never append a new changelog entry to the end of `CHANGELOG.md`. Always insert it directly below the `<!-- ENTRI-BARU-SISIPKAN-DI-SINI -->` marker.
- The marker sits directly below the `## [Unreleased]` heading and above the block of `### Unreleased Update` entries. A new entry therefore lands above the existing ones, which preserves the newest-first order of that block.
- Re-verify this description against the real file whenever the changelog structure changes.
- Before adding an entry, check that the marker exists. If it does not, add it as its own commit before creating any branch that will add entries.
- If several Pull Requests are open at the same time and each must add a changelog entry, the insertion rule above removes the need to serialize them. Do not create stacked branches or chain merges purely to avoid changelog conflicts.
- When resolving a `CHANGELOG.md` conflict, keep every entry from both sides. Entries from different Pull Requests are additive and never contradict. Never resolve a changelog conflict by dropping an entry.

## Planning and Progress Tracking

These rules exist because a detailed plan agreed in conversation disappears as soon as the session ends, and because finished work was never recorded anywhere that could be audited against the plan that produced it.

- `TODO.md` at the repository root is the single workspace for planned work. It uses Markdown task lists, and every planned item starts unchecked.
- After presenting a plan to the user, write that plan into `TODO.md` before starting implementation. The file must be detailed enough to execute from without re-reading the conversation.
- `TODO.md` uses three fixed sections, in this order:
  1. Active plans, one `###` heading per Pull Request, newest plan appended last.
  2. Deferred work, for anything that was raised but must not start yet.
  3. Known Issues, for problems that are deliberately recorded and not currently planned for a fix. Use plain bullets, not task checkboxes, so they are not read as queued work.
- Mark an item as done (`- [x]`) only in the same branch and the same Pull Request that delivers the work. Never tick a box in a separate or later commit, because that lets the file drift from the actual state of the code.
- Each Pull Request that carries planned work updates `TODO.md` in its own single-file commit, following the one-commit-per-file rule.
- An item only moves out of an Active plan when its Pull Request is merged. While the Pull Request is open the boxes stay ticked, because the work is delivered but not yet accepted.
- Planned work is tracked sequentially. Because ticking a box rewrites an existing line rather than inserting a new one, parallel branches touching the same unchecked item will conflict. Do not open parallel branches for planned work.
- When the user submits a new revision or improvement request, add it to `TODO.md` as a new section. Never overwrite or replace sections that are already there, and never renumber existing items. Earlier plans stay auditable.
- Boundaries between the root documents:
  - `TODO.md` holds planned work that is not yet done.
  - `CHANGELOG.md` holds user-facing release notes for merged work.
  - `worklog.md` holds a narrative of what was executed, in past tense.
  - `DEVIATIONS.md` holds decisions that depart from the specification documents (`ARCHITECTURE.md`, `PRD.md`, `SPEC.md`, `DESIGN.md`). Never record a plain design change there.
- Write `TODO.md` content in Indonesian, matching the Language Style rules above.

## Delivery Rules

- Explain the planned scope before material changes when requirements are ambiguous.
- Report changed files, validation results, migration requirements, and any remaining risks.
- After every requested change is implemented, update `CHANGELOG.md` immediately without waiting for a separate reminder.
- Never replace existing `CHANGELOG.md` entries; append each new entry below the existing content and separate it with a Markdown divider, respecting the marker rule above.
- After every requested change is implemented, create the relevant focused GitHub Issue and Pull Request without waiting for a separate reminder.
- Keep the Issue and Pull Request scoped to the implemented change, link them together, and never merge the Pull Request; the project owner performs the merge.
- Use real multiline Markdown for GitHub issues and pull requests; do not submit literal `\n` sequences.
- Do not create a release unless explicitly requested.

## GitHub Issue Rules

- Create an Issue for every bug, feature, or material behavior change that will be implemented.
- When a task contains multiple independently changeable files or scopes, create multiple focused Issues rather than one combined Issue; each Issue must describe only its own scope.
- Use a clear title with a type prefix, for example `fix:`, `feat:`, `docs:`, or `chore:`.
- Write the Issue body with real Markdown sections: `Masalah` or `Tujuan`, `Perilaku yang Diharapkan`, and `Acceptance Criteria`.
- Acceptance criteria must be concrete checkboxes and must describe observable behavior.
- Check existing open Issues before creating a new one to avoid duplicates.
- Keep Issue descriptions limited to the requested scope; do not add unrelated refactors.

## Branch and Commit Rules

- Start implementation branches from the latest `origin/main` whenever possible.
- Use a descriptive branch name such as `fix/rupiah-input-validation` or `feat/struk-generator`.
- Check `git status` before creating a branch, staging files, or committing.
- Stage only files belonging to the current task; preserve unrelated modifications and untracked user files.
- Use focused Conventional Commit messages with a type prefix, for example `fix:`, `feat:`, `docs:`, or `chore:`.
- Permanent user preference: always create one commit per changed file. Never group multiple changed files into a single commit unless the user explicitly approves grouping them for that task.
- When a task changes multiple files, the resulting commit count must reflect the number of changed files, even when the user does not repeat the request in the current message.
- Each commit should represent one coherent change and must not contain secrets, `.env`, generated files, logs, or unrelated formatting changes.
- Before pushing, verify `git diff --check` and run the relevant lint/build/test commands.
- Do not use destructive commands such as `git reset --hard`, `git checkout --`, or database reset commands without explicit approval.

## Pull Request Rules

- Check existing open PRs before creating a new PR for the same work.
- Create the PR from the implementation branch into `main`.
- A PR may contain many focused commits and should preserve the requested one-file-per-commit structure.
- Use a clear type-prefixed title matching the primary change.
- PR bodies must use real multiline Markdown with these sections:
  - `Ringkasan`
  - `Perubahan`
  - `Validasi`
  - `Dampak Data` or `Deployment Checklist` when relevant
- Link the related Issue with `Closes #<number>` or `Fixes #<number>` when the PR resolves it.
- State explicitly whether a database migration, environment-variable update, storage change, or manual deployment action is required.
- Do not claim a PR is ready until the branch is pushed and the checks have been reviewed.
- Always report the final Issue URL, PR URL, branch name, commit hash, and validation result to the user.
- The agent must never merge a PR. Only the user may merge it, even when all checks pass, unless the user explicitly changes this rule in a later instruction.

## Code Review Documentation Rules

- After creating a Pull Request, always populate `docs/review/CODE_REVIEW.md` with one consolidated code review comment covering the entire PR, before reporting completion to the user.
- Replace the entire previous content of `CODE_REVIEW.md` for the new PR, unless another Pull Request from the same session is still open. In that case, keep the existing block and add a new block below it instead of replacing it.
- Fill in `PR:` and `Repo:` header fields with the current PR number and repository name.
- Use a single code box containing one comment for the whole PR, since GitHub's "Submit review" applies to all changed files at once, not per file.
- When more than one Pull Request is open at the same time, `CODE_REVIEW.md` holds one block per Pull Request. Each block repeats the `PR:`, `Repo:`, and `Status:` header fields, and its heading states the Pull Request number.
- A review comment belongs to exactly one Pull Request and must never be submitted to another. When reporting to the user, list every open Pull Request number together with the block number in `CODE_REVIEW.md` that belongs to it, so the correct one can be copied.
- The comment must be genuine: summarize real potential bugs, improvement suggestions, or technical questions found across the changed files. Never write filler or generic praise.
- Cover all changed files in the PR within that one comment, including documentation files such as `CHANGELOG.md`, `TODO.md`, and `DESIGN.md`. Never limit review to code files only.
- For documentation files, review the content against reality rather than the code. For `CHANGELOG.md`, check that the entry states the real impact and does not omit a known risk. For `TODO.md`, check that the recorded plan matches what was actually done and does not point to files absent from the repository. For `DESIGN.md`, check that the written rule does not contradict the code and that no exception is left undocumented.
- Write the comment in Indonesian, matching the Language Style rules above.
- Mark the entry's `Status` as `[ ] belum dicopas` when written; never mark it as copied yourself, that is updated by the user.
- Do not modify any part of `CODE_REVIEW.md` outside the content inside the code boxes, per the rule already stated in that file. Adding a block for another open Pull Request, and adjusting that footer rule to match, are the only exceptions.
- This file is for the user's own internal documentation only; it does not affect GitHub's review scoring since the PR author cannot review their own PR.
