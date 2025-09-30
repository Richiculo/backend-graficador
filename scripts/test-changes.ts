// scripts/test-changes.ts
async function main() {
  const diagramId = 1;
  const sinceSeq = 0;

  const res = await fetch(`http://localhost:4000/collab/diagrams/${diagramId}/changes?sinceSeq=${sinceSeq}`);

  if (!res.ok) {
    console.error("❌ HTTP error:", res.status, res.statusText);
    console.error("Body:", await res.text());
    return;
  }

  const data = await res.json();
  console.log("✅ Changes response:", JSON.stringify(data, null, 2));
}

main().catch((err) => console.error("Unhandled error:", err));
