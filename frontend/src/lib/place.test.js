import { getPlaceLabel } from './place.js';

// Test case 1: profile with village="Pune", district="Pune", state="Maharashtra"
// Expected: "Pune, Maharashtra" (duplicate Pune removed)
const profile1 = {
  village: "Pune",
  district: "Pune",
  state: "Maharashtra",
  location: null
};
const result1 = getPlaceLabel(profile1);
console.assert(result1 === "Pune, Maharashtra", `Test 1 failed: expected "Pune, Maharashtra", got "${result1}"`);

// Test case 2: empty profile (null)
// Expected: "Your farm location"
const result2 = getPlaceLabel(null);
console.assert(result2 === "Your farm location", `Test 2 failed: expected "Your farm location", got "${result2}"`);

// Test case 3: empty profile (undefined)
// Expected: "Your farm location"
const result3 = getPlaceLabel(undefined);
console.assert(result3 === "Your farm location", `Test 3 failed: expected "Your farm location", got "${result3}"`);

console.log("All tests passed!");