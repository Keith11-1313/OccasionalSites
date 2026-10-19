import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAudience } from "./refresh-audience-ratings.mjs";

const page = data => `<script type="application/json" data-json="mediaScorecard">${JSON.stringify(data)}</script>`;
test("audience snapshots use All Audience counts, excluding critics and Verified Audience", () => {
  const parsed=parseAudience(page({
    criticsScore:{likedCount:99,notLikedCount:1},
    audienceScore:{likedCount:70,notLikedCount:2},
    overlay:{audienceVerified:{likedCount:70,notLikedCount:2},audienceAll:{likedCount:1200,notLikedCount:300,score:"80"}}
  }));
  assert.deepEqual(parsed,{liked:1200,notLiked:300,percent:80,population:"All Audience"});
});
test("missing counts are rejected rather than inferred; verified zero remains zero",()=>{
  assert.throws(()=>parseAudience(page({overlay:{audienceAll:{score:"90"}}})),/COUNTS_UNAVAILABLE/);
  assert.throws(()=>parseAudience(page({audienceScore:{likedCount:90,notLikedCount:10}})),/NO_ALL_AUDIENCE/);
  assert.equal(parseAudience(page({overlay:{audienceAll:{likedCount:12,notLikedCount:0,score:"100"}}})).notLiked,0);
});
