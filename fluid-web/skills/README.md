# Vendored brand skills

These are **not ours**. They are a verbatim copy of the [Agent
Skills](https://agentskills.io/specification.md) published at
[arnabbagxd/brand-building-skills](https://github.com/arnabbagxd/brand-building-skills),
MIT licensed (see `LICENSE`), vendored so the brand-chat backend has a fixed,
reviewable version of the instructions it runs on.

| | |
| --- | --- |
| Upstream | `https://github.com/arnabbagxd/brand-building-skills` |
| Commit | `4a0a8b5b7a0f64bf0fc551978a18a591670a5223` |
| Marketplace version | 1.2.0 |
| Vendored | 2026-08-06 |
| Skills | 29 |

`evals/` directories are not copied — they test the skills as agent
instructions, which is upstream's job, not ours.

## Why vendored rather than fetched

A brand's strategy should not silently change because someone pushed to a
repository we do not control. Pinning the commit means a change to the
instructions arrives as a reviewable diff, next to whatever prompt or parser
change it forces on our side.

## Why generated into TypeScript

`src/lib/skills/generated.ts` is compiled from these files by
`npm run skills:build`. Route handlers read the skills from that module rather
than from disk: serverless bundles only trace files a build can see statically,
and a `readFile` on a path assembled at runtime is exactly what they cannot
trace. Generating sidesteps the question.

CI runs `npm run skills:check`, which regenerates and fails if the result
differs — so the module can never drift from the markdown.

## Updating

```bash
git clone https://github.com/arnabbagxd/brand-building-skills /tmp/bbs
cp -r /tmp/bbs/skills/. fluid-web/skills/
rm -rf fluid-web/skills/*/evals
npm run skills:build            # in fluid-web
```

Then update the commit in the table above, and read the diff: a changed
`## Output` section usually means a parser in `src/lib/brand-chat/` needs to
change with it.
