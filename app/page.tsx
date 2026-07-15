import Link from "next/link";

export default function Landing() {
  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-top">
          <div className="brand">
            VTO <b>/ BETA</b>
          </div>
          <Link href="/auth" className="navlink">
            Sign in
          </Link>
        </div>
        <div className="hero">
          <h1>
            TRAIN YOUR
            <br />
            <span>ARTICULATION.</span>
          </h1>
          <p className="sub">
            Speedrun tongue twisters against the clock. Hold broadcast tempo
            and land every pause. Scored live from your speech — every run
            banked, every personal best tracked.
          </p>
          <div className="drill-cards">
            <div className="drill-card">
              <div className="dn">SPEEDRUN</div>
              <div className="dd">
                Say the phrase fast and clean. Beat the gold / silver / bronze
                gates — but cross the slur floor and the run doesn&apos;t bank.
              </div>
            </div>
            <div className="drill-card">
              <div className="dn">PACE &amp; PAUSE</div>
              <div className="dd">
                The opposite muscle: deliberate control. Hold your rate inside
                the tempo band and land the marked pauses.
              </div>
            </div>
          </div>
          <Link href="/auth" className="cta">
            START TRAINING
          </Link>
        </div>
        <div className="foot">
          Live speech recognition · desktop Chrome or Edge required
        </div>
      </div>
    </div>
  );
}
