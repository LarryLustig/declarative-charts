# Contributing

Thanks for your interest.

## Pull requests are not open yet

The API is still changing ahead of 1.0. Merging a contribution would be a
compatibility promise it is too early to make, and it would be unfair to accept
work that a breaking change might undo a fortnight later.

That will change at 1.0. Watch the repository, or see
[ROADMAP.md](ROADMAP.md) for what stands between here and there.

## Issues are open, and welcome

Bug reports are the most useful thing a pre-1.0 library can get.

- **[Report a bug](../../issues/new?template=bug_report.yml)**
- **[Request a feature](../../issues/new?template=feature_request.yml)**

Two things worth doing first:

1. **Check the browser console.** This library reports its own
   misconfigurations as `DC###` codes, by default — an unknown palette name, a
   reference line outside the axis range, a value it could not parse. The code
   and message usually explain the problem faster than an issue thread will.
   Every code is listed in [API.md](API.md).
2. **Check [ROADMAP.md](ROADMAP.md)** before requesting a feature. It records
   what has been explicitly *declined* as well as what is planned; a bulk-data
   attribute, for example, is a deliberate omission with reasons, not an
   oversight.

## Security

Do not report vulnerabilities as public issues. See
[SECURITY.md](SECURITY.md) for private reporting.

## Conduct

[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). It is short.

## Running it locally

```bash
git clone https://github.com/LarryLustig/declarative-charts.git
cd declarative-charts
npm install
npm run dev      # examples at localhost:5173
npm run test:run
```

If you are working in the source, [CLAUDE.md](CLAUDE.md) is the architecture
index — conventions, and where each invariant is written in the code.

## Releasing

Publishing is manual and runs from a maintainer's machine. `prepublishOnly`
runs `test:run`, `build`, `test:package` and `test:visual`, so a release cannot
skip the suite.

```bash
# main is pushed and CI is green.
# CHANGELOG.md: rename [Unreleased] to the version, with today's date.
git commit -am "Release 0.3.0"

npm version minor        # bumps package.json, commits and tags in one step
npm publish --dry-run    # read the file list against "files"
npm publish
git push --follow-tags
```

Then cut a GitHub release from the new tag.

**Use `npm version`, never a hand-edited `package.json`.** It makes the commit
and the tag together, which is what keeps the tag and the published tarball in
step. npm records the commit it was published from as `gitHead`, so the two can
always be checked against each other — for 0.2.0 both are `1479a6e`, meaning
`git checkout v0.2.0` reproduces what is on the registry.

**Publish from a machine that can run `test:visual`.** Those baselines are
`-chromium-win32` and no CI runner reproduces them, which is why publishing
cannot move to GitHub Actions without either dropping that gate or paying for
Windows runners. It also means releases carry no npm provenance attestation.
That is the accepted trade, not an oversight.

**The npm page is a snapshot taken at publish time.** The README and the
`description` shown on npmjs.com change only when you publish; pushing to
GitHub does nothing for them. `description` is also the subtitle under the
package in npm search results, so re-read it before each release — it is one of
the few discovery surfaces the project controls.

**Choosing the number.** While the library is 0.x, anything that changes
observable behaviour takes the minor, and a fix that changes nothing a caller
could see takes the patch. Ship anything unproven as `npm publish --tag next`,
so `latest` keeps pointing at a version that has been used.

**If the gate fails, re-run it once before investigating.** `prepublishOnly` runs
the whole visual suite, which is the heaviest thing in the repo, and a flake
under that load looks exactly like a real regression in the output. Two aborted
the 0.3.0 release before being found and fixed. If the second run is clean,
treat the first as a flake and say so in the commit that fixes it; if both fail
the same way, it is real.

**`npm version` makes an annotated tag, and `--follow-tags` only pushes those.**
Re-pointing a tag with `git tag -f` replaces it with a lightweight one, which
that push then skips silently. Use `git tag -a -f` if a tag ever has to move,
and check `git ls-remote --tags origin` afterwards rather than trusting the
push. The tag is what makes a release reproducible: npm records the commit as
`gitHead`, and for 0.3.0 both are `4f7d93b`.

**What cannot be undone.** A published version number is burned permanently,
even if the version is later removed. `npm unpublish` is available for 72 hours
and only narrowly after that; past it the remedy is `npm deprecate` plus a new
release.

## License

MIT. See [LICENSE](LICENSE).
