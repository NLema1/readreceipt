import { FONT, RR, Kicker, Hair } from "../components/atoms";

export default function Privacy() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "72px 32px 96px", fontFamily: FONT.sans, color: RR.ink }}>
      <Kicker>Privacy</Kicker>
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
        What we collect.
      </h1>

      <Hair />

      <section style={{ marginTop: 32, fontFamily: FONT.serif, fontSize: 19, lineHeight: 1.55, color: RR.ink2 }}>
        <p>
          Readreceipt does not require an account, does not run analytics, and does not set tracking cookies.
          We don’t collect, store, or share user data of any kind.
        </p>
        <p>
          The only data the site stores is the public-record data shown on it — articles fetched from news
          outlets, the versions captured at each scrape, and the classifier’s rationale.
        </p>
      </section>
    </div>
  );
}
