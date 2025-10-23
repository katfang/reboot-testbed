import { ExternalContext } from "@reboot-dev/reboot";
import { Inside } from "../api/inside/v1/inside_rbt.js";

const tester = async () => {
  console.log("!!! 1");
  const context = new ExternalContext(
    {
      name: "send message",
      url: "http://localhost:9991"
    }
  )

  const inside = Inside.ref("thing");
  let response = await inside.listAll(context);
  console.log(response);
  console.log("!!! 2");

  console.log(Inside.servicer);
};

await tester();