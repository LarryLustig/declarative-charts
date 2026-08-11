# Security Policy

## Supported versions

This library is pre-1.0 and moves quickly. Only the latest version published to
npm receives fixes; there are no maintenance branches.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅ |
| < 0.1   | ❌ (never published) |

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private reporting — the
[Security tab](https://github.com/LarryLustig/declarative-charts/security/advisories/new)
opens a draft advisory that reaches the maintainer without disclosing anything.
By email: larrylustig@gmail.com.

Useful reports include the version, a minimal piece of markup that demonstrates
the problem, and what an attacker gains. A proof of concept beats a description.

Expect an acknowledgement within a week. This is a personal project with no
on-call rotation, so please allow reasonable time for a fix before disclosing
publicly.

## The threat model

This library turns HTML attributes into SVG. Its stated purpose is that your
**server template** generates that markup from your data — so the realistic
question is always: *what happens when an attribute value comes from a database
row rather than from the developer's keyboard?*

That is the standard against which reports are judged. "The page author can
inject script into their own page" is not a finding. "A value that looks like a
colour can run script" is.

### Where markup is deliberately parsed

- **`<dc-popup>` content is rendered as HTML.** It is bound with `.innerHTML`,
  which is the point — popups take formatted content. If you build popup content
  from untrusted input, escape it, exactly as you would anywhere else in your
  template. The **auto**-generated popup content is not the same thing: the
  library builds that from your attributes and escapes it (see below).
- **`href` on data elements becomes a real link,** and `javascript:` URLs are
  not filtered. Same rule as any `<a href>` you render.
- **Unrecognised attributes are copied verbatim onto the generated SVG shape.**
  That is the mechanism `hx-*`, `data-*`, Alpine and Stimulus bindings rely on,
  and it will equally copy an inline event handler.

In each of those, the library is doing what the markup asked for, visibly. The
escaping is the template author's, as it is for the rest of the page.

### Where it must not be parsed, and once was

Two places built markup as a **string** from your attributes and handed it to a
parser. Both are fixed; both are recorded here because the shape of the mistake
is worth recognising.

**Auto-popup content**, which is bound with `.innerHTML`:

```html
<dc-bar label='<img src=x onerror="…">' auto-popup>
```

executed on hover, in Chromium. `label` is the attribute most likely to come
straight from a database row. Auto-popup content is now built with a tagged
template that escapes every interpolation by construction.

**Pattern definitions**, the one place the library hands SVG to lit's
`unsafeSVG`. `pattern-stroke` and `pattern-fill` were interpolated unescaped,
so:

```html
<dc-bar pattern="dots" pattern-stroke='red"/><image href="x" onerror="…"/><line stroke="'>
```

executed script. Both `<animate onbegin>` and `<image onerror>` fired in
Chromium. That is exactly the class above — an attribute that looks like it
takes a colour, in a library whose premise is that colours may come from your
data.

Values are escaped at the single call site now.

Both are covered by tests that assert on the **parsed DOM** rather than on the
generated string, because a string containing `&lt;script&gt;` proves nothing
about what a parser then does with it —
`test/component/pattern-injection.test.ts` and
`test/component/popup-injection.test.ts`.

**If you find another value that reaches a markup parser, that is the same bug
and we want to hear about it.** Both of these were found by auditing rather than
reported, and an audit is only ever a snapshot.

## Out of scope

- Denial of service from deliberately enormous charts. Element count is the page
  author's, and render cost is documented.
- Vulnerabilities in Lit — report those to
  [lit/lit](https://github.com/lit/lit/security).
- Anything that requires the attacker to already control the page's markup or
  run script in it.
