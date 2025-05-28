This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

```bash
npm install
```

## Repro the bug

1. run
    ```bash
    npx rbt run dev
    npm run dev
    ```
2. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
3. Inspect the reboot backend at [http://localhost:9991/__/inspect](http://localhost:9991/__/inspect)
4. Make a move by selecting a pawn and selecting any other square.
5. Cancel it by pressing "cancel" in the right column.
6. See that the pending state did not get cleared.
    1. in the console, will get
        ```
        outstanding moves     // array of moves that have been queued, but are either pending or have not been acked by the client
        pending cancel moves  // the pending array of moves to cancel as seen by reboot
        ```
    2. when pending cancel moves clears, will see in outstanding moves
        ```
        outstanding moves
            Object { response: {…}, isLoading: false, aborted: undefined }
                aborted: undefined
                isLoading: false
                response: Object { moves: {…} }
                moves: Object { "playerA-singleton-b-p4":
                    { playerId: "playerA", pieceId: "singleton-b-p4", status: 1, … }
                }
        ```
    3. Notably, `status: 1` means the client still sees this as a PENDING move rather than a CANCELED move. (`MoveStatus` defined in `api/cheaoss/v1/move.proto`)
    4. The terminal running the backend reads:
        ```bash
        !!! get outstanding moves {
        'playerA-singleton-b-p4': _Move {
            playerId: 'playerA',
            pieceId: 'singleton-b-p4',
            status: 5,
            error: '',
            start: _Location { row: 6, col: 4 },
            end: _Location { row: 4, col: 5 }
        }
        }
        ```
    5. Notably, it does see `status: 5`, which means it believes the move is CANCELED.
    6. If you don't see the problem, try making and canceling moves some more OR in `backend/src/game_servicer.ts` increase, `PIECES_PER_TEAM`

## What it should do

1. once a move has been set to CANCELED, the frontend should receive it (as it is listening to Get)
    1. changes to `useGetOutstandingMoves` (in `app/CheaossBoard.tsx`) should trigger `ackMoves`
    2. `ackMoves` should call the server's `AckMove` and clear the visual pending state (`app/CheaossBoard.tsx` lines 37-39).
2. In `backend/src/game_servicer.ts`, if you change `PIECES_PER_TEAM` to 1, the problem goes away.

## What's the data flow?

1. Making a move on the board generates a QueueMove call which adds it to
    2. `Game.moves_queue` - stores a copy of the move request
    2. `Move` object collection - stores move request + status
    1. `Game.outstanding_player_moves[playerid]` - stores move id of `Move` object.
    1. Why have `Game.moves_queue` not just store refs to the move object? Great question -- no reason other than that the `Move` collection was created later b/c of trying to send status information to the client.
1. Hear it back on the frontend as
    1. `Game.Queues` returns `Game.moves_queue` in `app/CheaossQueues.tsx` to display pending moves.
    2. `Game.GetOutstandingMoves(playerId)` which gets the associated `Move` objects listed by `Game.outstandingPlayerMoves[playerid]` to send the client the status.
        3. Frontend then calls `Game.AckMove` for any necessary moves

## Other Notes

1. You'll note in the `ackMoves()` function in `CheaossBoard.tsx`  that it also handles EXECUTED and ERRORED statuses. These seem to work just fine.
    1. You can find them in the main [https://github.com/katfang/cheaoss](katfang/cheaoss) repo. This is a slimmed down version to highlight the problem.
    2. The main difference between ending up in EXECUTED/ERRORED state vs CANCELED is that to cancel, the request starts from the client, whereas the call to set EXECUTED/ERRORED state starts from a scheduled call to RunQueue on the backend.
2. How many pawns there are seems to affect whether this repros / how consistent it is. More pawns, more problems.
3. Removing calls / modifying the message definition of the stored object seemed to change how many pawns were necessary for consistent repro. See commits
    1. 9533f531a75e3d35808ff5586d1468c1f9f3dbb5 -- merged two repeated fields in the message into one.
    1. 33b2807e8d0ac6545929173e22846fdcdbdb8f1f / aa995bbbdfead225c56fd7c9eda2002059df69bd -- removed frontend call to AssignTeam, and then later removed the AssignTeam backend code. Removing the frontend call seemed to increase amount of calls necessary to repro the problem (at 4 pawns per team). Removing backend code didn't seem to add much more to inconsistenty. Both consistently repro'd at 5 pawns per team.
4. This example expects ONE client b/c the playerID is coded. If you do run with 2 browsers, someone generally does ack the move (though possibly not the client that had the pending visuals).

## Files of interest
 * `api/cheaoss/v1/game.proto`, `move.proto`, `piece.proto` -- definitions of states and servicers.
    * `game.proto` is the main one.
    * `move.proto` also has the list of statusus.
 * `backend/src/game_servicer.ts` -- servicer code
 * `app/CheaossBoard.tsx` -- frontend repro entry point where pending move is shown
 * `app/CheaossQueues.tsx` -- frontend repro where cancel kicks off