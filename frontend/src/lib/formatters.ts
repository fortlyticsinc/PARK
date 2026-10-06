const supervisorTitles = new Set([
  "mr", "mister", "mrs", "missus", "ms", "miss", "dr", "doctor",
  "prof", "professor", "engr", "engineer", "eng", "rev", "revd",
  "reverend", "pastor", "chief", "hon", "honourable", "honorable",
  "sir", "dame", "alhaji", "alhaja", "mallam", "imam", "fr", "father",
  "sr", "sister", "elder", "barr", "barrister", "arch", "architect",
  "capt", "captain", "col", "colonel", "lt", "lieutenant", "gen",
  "general", "prince", "princess",
]);

export function supervisorFirstName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1) {
    const title = parts[0].replace(/[.,]/g, "").toLowerCase();
    if (!supervisorTitles.has(title) && !/^[a-z]{1,5}\.$/i.test(parts[0])) break;
    parts.shift();
  }
  return parts[0] ?? "";
}