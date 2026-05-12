import { Link } from "react-router-dom";
import { FONT, RR, Kicker, Hair } from "../components/atoms";

export default function About() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "72px 32px 96px", fontFamily: FONT.sans, color: RR.ink }}>
      <Kicker>About</Kicker>
      <h1
        style={{
          fontFamily: FONT.serif,
          fontWeight: 400,
          fontSize: 56,
          lineHeight: 1.0,
          letterSpacing: "-0.01em",
          margin: "12px 0 28px",
        }}
      >
        What Readreceipt is, and what it isn’t.
      </h1>

      <Hair />

      <section style={{ marginTop: 32, fontFamily: FONT.serif, fontSize: 19, lineHeight: 1.55, color: RR.ink2 }}>
        <p>
          Readreceipt is an open ledger of editorial change. It polls a small set of major news outlets every
          five minutes, snapshots each new article, and records the moments when a headline shifts, a fact
          moves, or a source quietly disappears between revisions. Every change gets a public receipt — a
          severity grade, a one-sentence rationale, and a permanent URL.
        </p>
        <p>
          The project exists because online news is now mostly read once, sometimes hours after publication,
          and silently re-edited in the meantime. Most outlets don’t mark those edits. Readreceipt does the
          marking from the outside, by reading the page again and comparing.
        </p>
        <p>
          Classification is done by Claude Haiku 4.5. The severity scale runs from 1 (cosmetic) to 5 (a
          reversal of the article’s meaning). The methodology page is on the homepage —{" "}
          <Link to="/#method" style={{ color: RR.ink, textDecoration: "underline" }}>read the method</Link>.
        </p>
      </section>

      <Hair style={{ margin: "36px 0 28px" }} />

      <section style={{ fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.6, color: RR.ink2 }}>
        <div>
          <Kicker>Who built this</Kicker>
          <p style={{ marginTop: 8 }}>
            Built and maintained by Natenael Lema as a solo project.
          </p>
        </div>
        <div style={{ marginTop: 20 }}>
          <Kicker>Stage</Kicker>
          <p style={{ marginTop: 8 }}>
            Solo project, in active development. Expect rough edges; feedback is welcome.
          </p>
        </div>
        <div style={{ marginTop: 20 }}>
          <Kicker>Contact</Kicker>
          <p style={{ marginTop: 8 }}>
            <a href="mailto:natenael.l@gmail.com" style={{ color: RR.ink, textDecoration: "underline" }}>
              natenael.l@gmail.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
