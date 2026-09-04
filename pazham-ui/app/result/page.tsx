"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BananaAnalysis = {
  maxCurvature?: number;
  averageCurvature?: number;
  totalTurningDegrees?: number;
  polynomial?: number[];
  score?: number;
  verdict?: string;
};

/* =========================================================
   VERDICT
========================================================= */

function getVerdict(score: number): string {
  if (score < 15) {
    return "Bro is basically a plantain.";
  }

  if (score < 30) {
    return "Slightly bent. Respectfully.";
  }

  if (score < 45) {
    return "Okay, she's got a little curve.";
  }

  if (score < 60) {
    return "A respectable amount of banana.";
  }

  if (score < 75) {
    return "That banana took a questionable turn.";
  }

  if (score < 90) {
    return "This banana has absolutely no intention of going straight.";
  }

  return "This banana needs to explain itself.";
}

/* =========================================================
   POLYNOMIAL FORMATTER
========================================================= */

function formatPolynomial(coefficients: number[]): string {
  if (!coefficients || coefficients.length === 0) {
    return "Unavailable";
  }

  const degree = coefficients.length - 1;

  return coefficients
    .map((coefficient, index) => {
      if (!Number.isFinite(coefficient)) {
        return "";
      }

      if (Math.abs(coefficient) < 0.000001) {
        return "";
      }

      const power = degree - index;
      const sign = coefficient >= 0 ? "+" : "-";
      const value = Math.abs(coefficient).toFixed(4);

      if (power === 0) {
        return `${sign} ${value}`;
      }

      if (power === 1) {
        return `${sign} ${value}x`;
      }

      return `${sign} ${value}x^${power}`;
    })
    .filter(Boolean)
    .join(" ")
    .replace(/^\+ /, "");
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function ResultPage() {
  const router = useRouter();

  const [data, setData] = useState<BananaAnalysis | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);

  /*
   * This is the position of the banana on the meter.
   *
   * IMPORTANT:
   * Backend score = 0 to 100
   * Meter position = 0% to 100%
   */
  const [meterPosition, setMeterPosition] = useState(0);

  /* =======================================================
     LOAD ANALYSIS
  ======================================================= */

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("bananaAnalysis");

      if (!stored) {
        router.push("/");
        return;
      }

      const parsed: BananaAnalysis = JSON.parse(stored);

      setData(parsed);

      /*
       * USE THE BACKEND SCORE DIRECTLY.
       *
       * Do NOT calculate another score from maxCurvature.
       */
      const backendScore = Number(parsed.score);

      const finalScore = Number.isFinite(backendScore)
        ? Math.max(0, Math.min(100, backendScore))
        : 0;

      setScore(finalScore);

      /*
       * Loading animation
       */
      const loadingTimer = setTimeout(() => {
        setLoading(false);
      }, 500);

      /*
       * Reveal card
       */
      const revealTimer = setTimeout(() => {
        setShowResult(true);
      }, 700);

      /*
       * Move banana across meter.
       */
      const meterTimer = setTimeout(() => {
        setMeterPosition(finalScore);
      }, 900);

      return () => {
        clearTimeout(loadingTimer);
        clearTimeout(revealTimer);
        clearTimeout(meterTimer);
      };
    } catch (error) {
      console.error("Could not read banana analysis:", error);
      router.push("/");
    }
  }, [router]);

  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (!data || loading) {
    return (
      <main className="loading-page">
        <div className="loading-box">
          <div className="loading-banana">🍌</div>

          <div className="loading-title">
            PAZHAM
          </div>

          <div className="loading-text">
            CALCULATING BANANA NONSENSE...
          </div>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            background: #f5d547;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #3b2414;
            font-family: "Courier New", monospace;
          }

          .loading-box {
            background: #f8e477;
            border: 5px solid #3b2414;
            padding: 45px;
            text-align: center;
            box-shadow: 10px 10px 0 #3b2414;
          }

          .loading-banana {
            font-size: 75px;
            animation: bananaBounce 0.7s infinite alternate;
          }

          .loading-title {
            margin-top: 20px;
            font-size: 35px;
            font-weight: 900;
          }

          .loading-text {
            margin-top: 15px;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 2px;
          }

          @keyframes bananaBounce {
            from {
              transform: translateY(0) rotate(-5deg);
            }

            to {
              transform: translateY(-12px) rotate(5deg);
            }
          }
        `}</style>
      </main>
    );
  }

  /* =======================================================
     MAIN RESULT
  ======================================================= */

  return (
    <main className="page">
      <div className="dither" />

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="header">
        <button
          className="logo"
          onClick={() => router.push("/")}
        >
          PAZHAM
        </button>

        <div className="header-right">
          CURVATURE ANALYSIS SYSTEM v1.0
        </div>
      </header>

      {/* =================================================
          SCORECARD
      ================================================= */}

      <section
        className={`card ${showResult ? "visible" : ""}`}
      >
        <div className="stamp">
          OFFICIAL
          <br />
          BANANA
          <br />
          ASSESSMENT
        </div>

        <div className="eyebrow">
          BANANA CURVATURE REPORT
        </div>

        <h1>
          YOUR BANANA
          <br />
          HAS BEEN JUDGED.
        </h1>

        {/* =================================================
            SCORE
        ================================================= */}

        <section className="score-section">
          <div className="score-label">
            PAZHAM CURVATURE INDEX
          </div>

          <div className="score">
            {score.toFixed(1)}
            <span>/100</span>
          </div>
        </section>

        {/* =================================================
            METER
        ================================================= */}

        <section className="curvature-meter">
          <div className="meter-header">
            <span>STRAIGHT</span>

            <span className="meter-title">
              BANANA-METER
            </span>

            <span>ABSURD</span>
          </div>

          <div className="meter">
            {/* Track */}

            <div className="meter-track" />

            {/* Filled progress */}

            <div
              className="meter-fill"
              style={{
                width: `${meterPosition}%`,
              }}
            />

            {/* Banana */}

            <div
              className="banana-pointer"
              style={{
                left: `${meterPosition}%`,
              }}
            >
              🍌
            </div>

            {/* Tick marks */}

            <div className="meter-ticks">
              {Array.from({ length: 11 }).map((_, index) => (
                <div
                  key={index}
                  className="meter-tick"
                >
                  <div className="tick-mark" />

                  <span>
                    {index * 10}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Exact score underneath */}

          <div className="meter-score">
            <span>0</span>

            <strong>
              {score.toFixed(1)}
            </strong>

            <span>100</span>
          </div>
        </section>

        {/* =================================================
            VERDICT
        ================================================= */}

        <section className="verdict-box">
          <div className="verdict-label">
            PAZHAM VERDICT
          </div>

          <div className="verdict">
            "{data.verdict || getVerdict(score)}"
          </div>
        </section>

        {/* =================================================
            MATHEMATICAL EVIDENCE
        ================================================= */}

        <section className="technical">
          <div className="technical-title">
            MATHEMATICAL EVIDENCE
          </div>

          <div className="technical-grid">
            <div className="technical-item">
              <span>
                MAX CURVATURE
              </span>

              <strong>
                {Number(data.maxCurvature ?? 0).toFixed(5)}
              </strong>
            </div>

            <div className="technical-item">
              <span>
                TOTAL TURNING
              </span>

              <strong>
                {Number(
                  data.totalTurningDegrees ?? 0
                ).toFixed(1)}
                °
              </strong>
            </div>
          </div>

          {data.polynomial && (
            <div className="equation">
              <span className="equation-label">
                FITTED EQUATION:
              </span>

              <br />

              y ={" "}
              {formatPolynomial(data.polynomial)}
            </div>
          )}
        </section>

        {/* =================================================
            ANALYZE AGAIN
        ================================================= */}

        <button
          className="another-button"
          onClick={() => {
            sessionStorage.removeItem("bananaAnalysis");
            router.push("/");
          }}
        >
          ANALYZE ANOTHER BANANA 🍌
        </button>
      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer>
        PAZHAM™ • ADVANCED BANANA GEOMETRY • PROBABLY
      </footer>

      {/* =================================================
          STYLES
      ================================================= */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        /* ================================================
           PAGE
        ================================================ */

        .page {
          min-height: 100vh;
          background: #f5d547;
          color: #3b2414;
          font-family: "Courier New", monospace;
          padding-bottom: 60px;
          position: relative;
          overflow-x: hidden;
        }

        .dither {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.12;
          background-image: radial-gradient(
            #3b2414 0.8px,
            transparent 0.8px
          );
          background-size: 6px 6px;
          z-index: 0;
        }

        /* ================================================
           HEADER
        ================================================ */

        .header {
          height: 72px;
          border-bottom: 4px solid #3b2414;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 35px;
          position: relative;
          z-index: 2;
          background: rgba(245, 213, 71, 0.95);
        }

        .logo {
          background: #3b2414;
          color: #f5d547;
          border: 3px solid #3b2414;
          padding: 8px 14px;
          font-family: inherit;
          font-size: 24px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 4px 4px 0 #789b35;
          transition: 0.15s;
        }

        .logo:hover {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 #789b35;
        }

        .header-right {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        /* ================================================
           CARD
        ================================================ */

        .card {
          width: min(900px, calc(100% - 32px));
          margin: 55px auto 0;
          background: #f8e477;
          border: 5px solid #3b2414;
          box-shadow: 12px 12px 0 #3b2414;
          padding: 55px;
          position: relative;
          z-index: 1;
          opacity: 0;
          transform: translateY(15px);
          transition:
            opacity 0.5s ease,
            transform 0.5s ease;
        }

        .card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ================================================
           STAMP
        ================================================ */

        .stamp {
          position: absolute;
          right: 35px;
          top: 35px;
          border: 3px solid #789b35;
          color: #557329;
          padding: 8px 12px;
          font-size: 10px;
          font-weight: 900;
          text-align: center;
          line-height: 1.2;
          transform: rotate(7deg);
        }

        /* ================================================
           HEADING
        ================================================ */

        .eyebrow {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 3px;
          margin-bottom: 15px;
        }

        h1 {
          font-size: clamp(32px, 6vw, 58px);
          line-height: 0.95;
          margin: 0;
          max-width: 650px;
          letter-spacing: -3px;
        }

        /* ================================================
           SCORE
        ================================================ */

        .score-section {
          text-align: center;
          margin-top: 45px;
        }

        .score-label {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 3px;
        }

        .score {
          font-size: clamp(90px, 16vw, 155px);
          font-weight: 900;
          line-height: 0.9;
          margin-top: 12px;
          letter-spacing: -8px;
        }

        .score span {
          font-size: 24px;
          letter-spacing: 0;
          margin-left: 8px;
        }

        /* ================================================
           METER
        ================================================ */

        .curvature-meter {
          width: 100%;
          margin-top: 45px;
        }

        .meter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .meter-title {
          font-size: 12px;
          letter-spacing: 3px;
        }

        .meter {
          position: relative;
          height: 145px;
          margin-top: 10px;
          /*
           * Horizontal padding prevents the banana from
           * getting clipped at 0 and 100.
           */
          padding: 0 32px;
        }

        /* ================================================
           TRACK
        ================================================ */

        .meter-track {
          position: absolute;
          left: 32px;
          right: 32px;
          top: 50px;
          height: 14px;
          background: #f5d547;
          border: 4px solid #3b2414;
          z-index: 1;
        }

        /* ================================================
           FILLED TRACK
        ================================================ */

        .meter-fill {
          position: absolute;
          left: 32px;
          top: 50px;
          height: 14px;
          background: #789b35;
          border-top: 4px solid #3b2414;
          border-bottom: 4px solid #3b2414;
          z-index: 2;

          width: 0%;

          transition:
            width 2s cubic-bezier(
              0.16,
              1,
              0.3,
              1
            );
        }

        /* ================================================
           BANANA POINTER
        ================================================ */

        .banana-pointer {
          position: absolute;

          /*
           * 32px matches the meter's left/right padding.
           * We calculate its movement using the full inner
           * width below.
           */
          left: 32px;

          top: -20px;

          transform:
            translateX(-50%)
            rotate(-10deg);

          font-size: 70px;
          line-height: 1;
          z-index: 5;

          transition:
            left 2s cubic-bezier(
              0.16,
              1,
              0.3,
              1
            );

          animation:
            bananaBounce 0.55s
            ease-in-out infinite
            alternate;

          transform-origin: center bottom;

          filter:
            drop-shadow(
              4px 4px 0 #3b2414
            );

          user-select: none;
          pointer-events: none;
        }

        @keyframes bananaBounce {
          from {
            transform:
              translateX(-50%)
              translateY(0)
              rotate(-10deg);
          }

          to {
            transform:
              translateX(-50%)
              translateY(-10px)
              rotate(8deg);
          }
        }

        /* ================================================
           TICKS
        ================================================ */

        .meter-ticks {
          position: absolute;
          left: 32px;
          right: 32px;
          top: 73px;
          display: flex;
          justify-content: space-between;
          z-index: 3;
        }

        .meter-tick {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .tick-mark {
          width: 3px;
          height: 14px;
          background: #3b2414;
        }

        .meter-tick span {
          font-size: 9px;
          font-weight: 900;
        }

        /* ================================================
           METER SCORE
        ================================================ */

        .meter-score {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: -5px 32px 0;
          font-size: 9px;
          font-weight: 900;
        }

        .meter-score strong {
          font-size: 12px;
          letter-spacing: 2px;
        }

        /* ================================================
           VERDICT
        ================================================ */

        .verdict-box {
          margin-top: 25px;
          padding: 27px;
          border: 4px solid #3b2414;
          background: #789b35;
          color: #f8e477;
          text-align: center;
          box-shadow: 7px 7px 0 #3b2414;
        }

        .verdict-label {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 3px;
          margin-bottom: 12px;
        }

        .verdict {
          font-size: clamp(18px, 3vw, 27px);
          line-height: 1.2;
          font-weight: 900;
        }

        /* ================================================
           TECHNICAL
        ================================================ */

        .technical {
          margin-top: 45px;
          border-top: 4px dashed #3b2414;
          padding-top: 25px;
        }

        .technical-title {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 20px;
        }

        .technical-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .technical-item {
          border: 3px solid #3b2414;
          padding: 15px;
        }

        .technical-item span {
          display: block;
          font-size: 9px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .technical-item strong {
          font-size: 20px;
        }

        /* ================================================
           EQUATION
        ================================================ */

        .equation {
          margin-top: 15px;
          padding: 16px;
          border: 3px solid #3b2414;
          background: #f5d547;
          font-size: 14px;
          font-weight: 900;
          overflow-x: auto;
          white-space: nowrap;
        }

        .equation-label {
          font-size: 9px;
          letter-spacing: 1px;
        }

        /* ================================================
           BUTTON
        ================================================ */

        .another-button {
          width: 100%;
          margin-top: 40px;
          padding: 18px;
          border: 4px solid #3b2414;
          background: #3b2414;
          color: #f5d547;
          font-family: inherit;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 7px 7px 0 #789b35;
          transition: 0.15s;
        }

        .another-button:hover {
          transform: translate(3px, 3px);
          box-shadow: 4px 4px 0 #789b35;
        }

        .another-button:active {
          transform: translate(7px, 7px);
          box-shadow: 0 0 0 #789b35;
        }

        /* ================================================
           FOOTER
        ================================================ */

        footer {
          position: relative;
          z-index: 1;
          text-align: center;
          margin-top: 45px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        /* ================================================
           MOBILE
        ================================================ */

        @media (max-width: 650px) {
          .header {
            padding: 0 15px;
          }

          .header-right {
            display: none;
          }

          .card {
            padding: 30px 20px;
            margin-top: 30px;
          }

          .stamp {
            display: none;
          }

          h1 {
            letter-spacing: -2px;
          }

          .technical-grid {
            grid-template-columns: 1fr;
          }

          .meter {
            height: 130px;
            padding: 0 22px;
          }

          .meter-track {
            left: 22px;
            right: 22px;
          }

          .meter-fill {
            left: 22px;
          }

          .meter-ticks {
            left: 22px;
            right: 22px;
          }

          .meter-score {
            margin-left: 22px;
            margin-right: 22px;
          }

          .banana-pointer {
            font-size: 52px;
            top: -5px;
          }

          .meter-tick span {
            font-size: 8px;
          }
        }
      `}</style>
    </main>
  );
}