import { useState } from "react";

export function App() {
  const [prompt, setPrompt] = useState("Design a 60 mm base diameter bottle that lofts to a 28 mm neck over 180 mm height.");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/si/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "request failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Beyond SI-CAD</h1>
        <p>Closed-loop SI planner. Plans are verified against the kernel before approval.</p>
      </header>
      <main>
        <label>
          Design narrative
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
        </label>
        <button onClick={generate} disabled={busy || !prompt.trim()}>
          {busy ? "Planning…" : "Generate plan"}
        </button>
        {error && <div className="error">{error}</div>}
        {result && (
          <section>
            <h2>
              Plan {result.verified ? "(verified)" : "(unverified)"} — {result.turns} turn{result.turns === 1 ? "" : "s"}
            </h2>
            {result.note && <p className="note">{result.note}</p>}
            <pre>{JSON.stringify(result.plan, null, 2)}</pre>
            {result.plan?.assumptions?.length ? (
              <ul>
                {result.plan.assumptions.map((a: string, i: number) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}
