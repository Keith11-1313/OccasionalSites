import { getStore } from "@netlify/blobs";
import catalog from "../../mcuarchive/checklist.json" with { type: "json" };
import initialProgress from "../data/initial-progress.json" with { type: "json" };
import { createChecklistHandler } from "../lib/checklist.mjs";

// Site-wide stores survive deployments. Preview deployments use separate data.
export default createChecklistHandler({
  catalog,
  initialProgress,
  getProgressStore: context => getStore({
    name: context?.deploy?.context === "production" ? "mcu-progress" : "mcu-progress-preview",
    consistency: "strong"
  })
});
