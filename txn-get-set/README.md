This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

```bash
npm install
```

## Repro the bug via button press

In two different tabs, run
```bash
npx rbt run dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Inspect the reboot backend at [http://localhost:9991/__/inspect](http://localhost:9991/__/inspect)

This uses react, reboot, next, typescript, tailwind? I guess?

The difference between "Repro ..." and "Works if Get Succeeds" is in the working case, the state for the ID associated with the "get" exists, whereas for the non-working cases, that ID is NOT associated with saved state.

## Repro the bug via backend

in `backend/main.ts`, uncomment out

```
await ReproPiece.ref("white-pawn").idempotently().movePiece(context);
```

and then run

```bash
npx rbt run dev
```

## Files of interest
 * `api/repro.proto` -- definitions of states and servicers 
 * `backend/repro_servicer.ts` -- servicer code
 * `backend/main.ts` -- backend repro entry point
 * `app/page.tsx` -- frontend repro entry point