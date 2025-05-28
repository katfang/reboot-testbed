"use client";

import { useEffect, useState } from "react";

import CheaossBoard from "./CheaossBoard";
import CheaossQueues from "./CheaossQueues";

export default function Home() {
  // This example assumes just one player.
  // However, if you comment this, and uncomment the below code,
  // each tab will be its own player.
  let playerId = "playerA";

  // let [playerId, setPlayerId] = useState<string|null>(null);
  // useEffect(() => {
  //   let sessionPlayerId = sessionStorage.getItem('playerId');
  //   if (sessionPlayerId === null) {
  //     sessionPlayerId = crypto.randomUUID();
  //     sessionStorage.setItem('playerId', sessionPlayerId);
  //   }
  //   setPlayerId(sessionPlayerId);
  // }, []);
  // console.log("playerId better be", playerId);

  // if (playerId === null) {
  //   return "Loading";
  // }

  return (
    <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] min-h-screen gap-4 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="w-full h-full bg-gray-500 p-4">
        <CheaossBoard gameId="singleton" playerId={playerId} />
      </div>
      <div className="w-full h-full bg-gray-500 p-4">
        <CheaossQueues gameId="singleton" playerId={playerId} />
      </div>
    </div>
  );
}