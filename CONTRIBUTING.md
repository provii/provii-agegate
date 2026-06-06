# Contributing to provii-agegate

## Prerequisites

- Node.js 20 or later
- npm 10+

## Dev Setup

```bash
git clone https://github.com/provii/provii-agegate.git
cd provii-agegate
npm install
npm run build
npm test
```

## Code Style

TypeScript strict mode is enforced. Run the linter before submitting:

```bash
npm run lint
npx tsc --noEmit
```

ESLint handles formatting and correctness rules. Do not introduce `any` types. Use `unknown` and narrow with type guards.

## Testing

Unit tests use Jest:

```bash
npm test              # all tests
npm run test:unit     # unit tests only
npm run test:strict   # with coverage and bail-on-failure
```

End-to-end tests use Playwright:

```bash
npx playwright test
```

Property-based tests run separately:

```bash
npm run test:property
```

All tests must pass before a PR will be reviewed.

## Commit Messages

Use conventional commits. Keep the subject line under 72 characters. Body is optional but encouraged for non-trivial changes.

```
feat: add session timeout configuration
fix: correct QR code sizing on mobile viewports
```

## Pull Request Process

1. Fork the repository and create a feature branch from `main`.
2. Make your changes. Write tests for new behaviour.
4. Run `npm run lint`, `npx tsc --noEmit`, and `npm test` locally.
5. Push your branch and open a pull request against `main`.

Keep PRs focused on a single concern. Large changes should be split into smaller PRs where possible.

## Licence

By contributing, you agree that your contributions will be licensed under the MIT licence.
