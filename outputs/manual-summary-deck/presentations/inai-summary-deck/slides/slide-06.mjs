import { base, box, C, text } from "./theme.mjs";
export async function slide06(presentation, ctx) {
  const slide = presentation.slides.add(); base(slide, ctx, "Testing & Results", "All 46 test cases passed across authentication, matching, and connections.", 6);
  [["46", "test cases", "All passed"], ["100%", "gender safety", "Cross-gender matching blocked"], ["100%", "privacy", "Room access blocked until accept"], ["<1.5s", "load time", "Average page load"], ["PBKDF2", "security", "Hashing + rate limiting"]].forEach((m, i) => { const x = 54 + i * 236; box(slide, ctx, x, 158, 196, 118, C.dark, C.dark); text(slide, ctx, x + 12, 174, 170, 36, m[0], { size: i === 4 ? 25 : 31, bold: true, color: i === 4 ? "#F6E7C4" : "#9FE3C8", align: "center" }); text(slide, ctx, x + 12, 218, 170, 22, m[1], { size: 14, bold: true, color: C.white, align: "center" }); text(slide, ctx, x + 12, 242, 170, 22, m[2], { size: 10.5, color: "#DDE8DE", align: "center" }); });
  text(slide, ctx, 94, 326, 520, 24, "Key results & metrics", { size: 20, bold: true, color: C.green });
  const rows = [["Category", "Result Verified"], ["Gender Safety", "100% enforcement: cross-gender matching blocked by system logic."], ["Privacy", "100% enforcement: unauthorized room access blocked."], ["Performance", "Under 1.5 seconds average page load time."], ["Security", "PBKDF2 hashing confirmed; rate limiting prevents brute force."], ["Testing Quality", "6 bugs found and fixed during testing."]];
  rows.forEach((r, i) => { const y = 370 + i * 38, fill = i === 0 ? C.dark : (i % 2 ? C.white : "#EFE8DA"), color = i === 0 ? C.white : C.ink; text(slide, ctx, 98, y, 210, 26, r[0], { size: 12.5, bold: true, color, fill }); text(slide, ctx, 316, y, 650, 26, r[1], { size: 12.5, color, fill }); });
  return slide;
}
