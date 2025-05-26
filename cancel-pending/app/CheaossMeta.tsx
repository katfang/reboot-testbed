"use client";

import { useState, useEffect } from "react";
import { useGame } from "../api/cheaoss/v1/game_rbt_react";
import { Team } from "../api/cheaoss/v1/cheaoss_pb";
import Error from "./Error";

export default function CheaossMeta({
  gameId,
  playerId
} : {
  gameId: string,
  playerId: string
}) {
  const { assignTeam } = useGame({id: gameId});
  let [team, setTeam] = useState(Team.WHITE);

  useEffect(() => {
    async function fetchTeamAssignment() {
      const { response } = await assignTeam({playerId: playerId});
      console.log("game heaeder", response);
      if (response === undefined) {
        return (
          <Error message="Could not get team" />
        )
      }
      setTeam(response.team);
    }
    fetchTeamAssignment();
  }, [playerId]);

  return (
    <div className="w-full h-full text-right">Assigned to team {Team[team]}.</div>
  );
}