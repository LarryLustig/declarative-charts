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

## License

MIT. See [LICENSE](LICENSE).
