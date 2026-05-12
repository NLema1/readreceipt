import { FONT, RR, Kicker, Hair } from "../components/atoms";

export default function Takedown() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "72px 32px 96px", fontFamily: FONT.sans, color: RR.ink }}>
      <Kicker>Takedown</Kicker>
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
        Removal requests.
      </h1>

      <Hair />

      <section style={{ marginTop: 32, fontFamily: FONT.serif, fontSize: 19, lineHeight: 1.55, color: RR.ink2 }}>
        <p>
          Readreceipt respects publisher takedown requests. To request removal of a tracked article or a
          specific receipt, email{" "}
          <a href="mailto:natenael.l@gmail.com" style={{ color: RR.ink, textDecoration: "underline" }}>
            natenael.l@gmail.com
          </a>{" "}
          with the article URL or receipt ID (the <code style={{ fontFamily: FONT.mono }}>RR-####</code> shown
          on every receipt). We respond within 5 business days.
        </p>
        <p style={{ marginTop: 16, fontSize: 16, color: RR.soft }}>
          Please include a brief reason for the request so we can route it correctly (e.g. legal, factual
          correction, ownership claim).
        </p>
      </section>
    </div>
  );
}
