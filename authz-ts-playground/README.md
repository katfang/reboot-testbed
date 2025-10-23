## Getting Started

```bash
npm install
```

## Repro the bug via button press

In two different tabs, run
```bash
npx rbt dev run
npx tsx frontend/tester.ts
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Inspect the reboot backend at [http://localhost:9991/__/inspect](http://localhost:9991/__/inspect)

This uses react, reboot, next, typescript, tailwind? I guess?

The difference between "Repro ..." and "Works if Get Succeeds" is in the working case, the state for the ID associated with the "get" exists, whereas for the non-working cases, that ID is NOT associated with saved state.


```bash
npx rbt dev run 
```