import { getNetworkConfig } from "@repo/stellar";
import { env } from "../env";

export const stellarNetwork = getNetworkConfig(env.stellarNetwork, {
  horizonUrl: env.stellarHorizonUrl,
});
