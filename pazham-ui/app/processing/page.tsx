"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";

type Point = [number, number];

type AnalysisData = {
  outlinePoints: Point[];
  centrelinePoints: Point[];
  polynomialPoints: Point[];
  coefficients: number[];
  equation: string;
  curvature: number;
  maxCurvature: number;
  maxCurvaturePoint: Point;
  bananaArea: number;
  imageWidth: number;
  imageHeight: number;
  polynomial: number[];
};

export default function ProcessingPage() {
  const router = useRouter();

  const [data, setData] =
    useState<AnalysisData | null>(null);

  const [bananaPreview, setBananaPreview] =
    useState<string | null>(null);

  const [imageDimensions, setImageDimensions] =
    useState({
      width: 1,
      height: 1,
    });

  const [stage, setStage] = useState(0);

  /* =================================================
     LOAD ANALYSIS DATA
  ================================================= */

  useEffect(() => {
    const stored =
      sessionStorage.getItem(
        "bananaAnalysis"
      );

    const preview =
      sessionStorage.getItem(
        "bananaPreview"
      );

    if (!stored) {
      router.push("/");
      return;
    }

    try {
      const parsed = JSON.parse(stored);

      const normalizedData: AnalysisData = {
        outlinePoints:
          Array.isArray(parsed.outlinePoints)
            ? parsed.outlinePoints
            : [],

        centrelinePoints:
          Array.isArray(parsed.centrelinePoints)
            ? parsed.centrelinePoints
            : [],

        polynomialPoints:
          Array.isArray(parsed.polynomialPoints)
            ? parsed.polynomialPoints
            : [],

        coefficients:
          Array.isArray(parsed.coefficients)
            ? parsed.coefficients
            : [],

        equation:
          parsed.equation ??
          "Unavailable",

        curvature:
          Number(parsed.curvature) || 0,

        maxCurvature:
          Number(
            parsed.maxCurvature ??
            parsed.curvature
          ) || 0,

        maxCurvaturePoint:
          Array.isArray(
            parsed.maxCurvaturePoint
          )
            ? parsed.maxCurvaturePoint
            : [0, 0],

        bananaArea:
          Number(parsed.bananaArea) || 0,

        /*
         * The backend may not send these anymore,
         * so we use the actual uploaded image
         * dimensions when available.
         */
        imageWidth:
          Number(parsed.imageWidth) || 1,

        imageHeight:
          Number(parsed.imageHeight) || 1,

        polynomial:
          Array.isArray(parsed.polynomial)
            ? parsed.polynomial
            : Array.isArray(
                parsed.coefficients
              )
            ? parsed.coefficients
            : [],
      };

      console.log(
        "Processing data:",
        normalizedData
      );

      console.log(
        "Contour points:",
        normalizedData.outlinePoints.length
      );

      console.log(
        "Centreline points:",
        normalizedData.centrelinePoints.length
      );

      setData(normalizedData);

      if (preview) {
        setBananaPreview(preview);
      }
    } catch (error) {
      console.error(
        "Could not load banana analysis:",
        error
      );

      router.push("/");
    }
  }, [router]);


  /* =================================================
     ANIMATION STAGES
  ================================================= */

  useEffect(() => {
    const timers = [
      setTimeout(
        () => setStage(1),
        1200
      ),

      setTimeout(
        () => setStage(2),
        3600
      ),

      setTimeout(
        () => setStage(3),
        5700
      ),

      setTimeout(
        () => setStage(4),
        8200
      ),

      setTimeout(
        () => setStage(5),
        11000
      ),
    ];

    return () =>
      timers.forEach(clearTimeout);
  }, []);


  /* =================================================
     LOADING
  ================================================= */

  if (!data) {
    return (
      <main className="processing-page loading-page">

        <div className="loading-container">

          <div className="loading-banana">
            🍌
          </div>

          <div className="loading-text">
            LOADING BANANA...
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

            font-family:
              "Courier New",
              monospace;
          }

          .loading-container {
            text-align: center;

            border:
              5px solid #3b2414;

            padding:
              40px;

            background:
              #f8e477;

            box-shadow:
              10px 10px 0 #3b2414;
          }

          .loading-banana {
            font-size: 70px;

            animation:
              bounce
              0.7s
              infinite
              alternate;
          }

          .loading-text {
            margin-top: 20px;

            font-size: 14px;

            font-weight: 900;

            letter-spacing: 2px;
          }

          @keyframes bounce {
            from {
              transform:
                translateY(0)
                rotate(-5deg);
            }

            to {
              transform:
                translateY(-12px)
                rotate(5deg);
            }
          }

        `}</style>

      </main>
    );
  }


  /* =================================================
     MAIN PAGE
  ================================================= */

  return (
    <main className="processing-page">

      {/* =============================================
          RETRO BACKGROUND
      ============================================= */}

      <div className="dither" />


      {/* =============================================
          HEADER
      ============================================= */}

      <header className="processing-header">

        <button
          className="mini-logo"
          onClick={() => {

            sessionStorage.removeItem(
              "bananaAnalysis"
            );

            sessionStorage.removeItem(
              "bananaPreview"
            );

            sessionStorage.removeItem(
              "bananaFileName"
            );

            router.push("/");
          }}
        >
          PAZHAM
        </button>


        <div className="analysis-number">
          ANALYSIS 01
        </div>

      </header>


      {/* =============================================
          CONTENT
      ============================================= */}

      <section className="processing-content">


        {/* =========================================
            TITLE
        ========================================= */}

        <motion.h1
          className="processing-title"

          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          ANALYZING YOUR BANANA....
        </motion.h1>


        {/* =========================================
            VISUAL AREA
        ========================================= */}

        <div className="visual-area">


          {/* =======================================
              BANANA IMAGE
          ======================================= */}

          <motion.div
            className="banana-panel"

            animate={{
              scale:
                stage >= 3
                  ? 0.82
                  : 1,

              x:
                stage >= 3
                  ? -180
                  : 0,
            }}

            transition={{
              duration: 1.2,

              ease: [
                0.22,
                1,
                0.36,
                1,
              ],
            }}
          >

            {bananaPreview ? (

              <img
                src={bananaPreview}
                className="uploaded-banana"
                alt="Uploaded banana"

                onLoad={(event) => {

                  const img =
                    event.currentTarget;

                  setImageDimensions({
                    width:
                      img.naturalWidth,

                    height:
                      img.naturalHeight,
                  });

                }}
              />

            ) : (

              <div className="image-placeholder">
                🍌
              </div>

            )}


            {/* =====================================
                OPENCV OVERLAY
            ===================================== */}

            <svg
              className="banana-overlay"

              viewBox={`0 0 ${
                imageDimensions.width
              } ${
                imageDimensions.height
              }`}

              preserveAspectRatio="xMidYMid meet"
            >


              {/* =================================
                  REAL CONTOUR
              ================================= */}

              <AnimatedPolyline
                points={
                  data.outlinePoints
                }

                className="banana-outline"

                visible={
                  stage >= 1
                }

                duration={2.2}
              />


              {/* =================================
                  REAL CENTRELINE
              ================================= */}

              <AnimatedPolyline
                points={
                  data.centrelinePoints
                }

                className="centre-line"

                visible={
                  stage >= 2
                }

                duration={1.8}
              />


              {/* =================================
                  CENTRELINE POINTS
              ================================= */}

              {data.centrelinePoints.map(
                (
                  point,
                  index
                ) => (

                  <motion.circle
                    key={
                      `centre-${index}`
                    }

                    cx={
                      point[0]
                    }

                    cy={
                      point[1]
                    }

                    r="3"

                    className="math-point"

                    initial={{
                      scale: 0,
                      opacity: 0,
                    }}

                    animate={{
                      scale:
                        stage >= 3
                          ? 1
                          : 0,

                      opacity:
                        stage >= 3
                          ? 1
                          : 0,
                    }}

                    transition={{
                      delay:
                        index *
                        0.015,

                      duration:
                        0.2,
                    }}
                  />

                )
              )}


              {/* =================================
                  MAX CURVATURE POINT
              ================================= */}

              {stage >= 5 &&
                data.maxCurvaturePoint && (

                  <motion.circle
                    cx={
                      data
                        .maxCurvaturePoint[0]
                    }

                    cy={
                      data
                        .maxCurvaturePoint[1]
                    }

                    r="10"

                    className="curvature-point"

                    initial={{
                      scale: 0,
                      opacity: 0,
                    }}

                    animate={{
                      scale: 1,
                      opacity: 1,
                    }}

                    transition={{
                      type: "spring",

                      stiffness: 200,

                      damping: 12,
                    }}
                  />

                )}

            </svg>

          </motion.div>


          {/* =========================================
              GRAPH
          ========================================= */}

          <Graph
            data={data}
            stage={stage}
          />

        </div>


        {/* =============================================
            STATUS
        ============================================= */}

        <div className="status-area">

          <motion.div
            className="status-text"
            key={stage}

            initial={{
              opacity: 0,
              y: 8,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}
          >

            {stage === 0 &&
              "INITIALIZING IMAGE ANALYSIS..."}

            {stage === 1 &&
              "TRACING BANANA OUTLINE..."}

            {stage === 2 &&
              "EXTRACTING CENTRELINE..."}

            {stage === 3 &&
              "SAMPLING MATHEMATICAL POINTS..."}

            {stage === 4 &&
              "PROJECTING DATA + FITTING CURVE..."}

            {stage === 5 &&
              "ANALYSIS COMPLETE"}

          </motion.div>


          {/* Progress */}

          <div className="progress-track">

            <motion.div
              className="progress-bar"

              animate={{
                width: `${Math.min(
                  stage * 20,
                  100
                )}%`,
              }}

              transition={{
                duration: 0.8,

                ease: "easeOut",
              }}
            />

          </div>

        </div>


        {/* =============================================
            EQUATION
        ============================================= */}

        <motion.div
          className="equation-container"

          initial={{
            opacity: 0,
            y: 30,
          }}

          animate={{
            opacity:
              stage >= 5
                ? 1
                : 0,

            y:
              stage >= 5
                ? 0
                : 30,
          }}

          transition={{
            duration: 0.8,
          }}
        >

          <div className="equation-label">
            POLYNOMIAL FIT
          </div>


          <div className="equation">

            <Equation
              text={data.equation}
            />

          </div>

        </motion.div>


        {/* =============================================
            CURVATURE RESULT
        ============================================= */}

        <motion.div
          className="curvature-result"

          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity:
              stage >= 5
                ? 1
                : 0,

            y:
              stage >= 5
                ? 0
                : 20,
          }}

          transition={{
            duration: 0.7,
          }}
        >

          <span>
            MAX CURVATURE
          </span>

          <strong>
            {data.maxCurvature.toExponential(
              4
            )}
          </strong>

        </motion.div>


        {/* =============================================
            RESULTS BUTTON
        ============================================= */}

        <motion.button
          className="results-button"

          initial={{
            opacity: 0,
            y: 15,
          }}

          animate={{
            opacity:
              stage >= 5
                ? 1
                : 0,

            y:
              stage >= 5
                ? 0
                : 15,
          }}

          transition={{
            delay: 0.5,
          }}

          onClick={() => {

            const current =
              sessionStorage.getItem(
                "bananaAnalysis"
              );

            if (current) {

              try {

                const parsed =
                  JSON.parse(current);

                const updated = {
                  ...parsed,

                  maxCurvature:
                    Number(
                      parsed.maxCurvature ??
                      parsed.curvature
                    ) || 0,

                  polynomial:
                    parsed.polynomial ??
                    parsed.coefficients ??
                    [],
                };

                sessionStorage.setItem(
                  "bananaAnalysis",
                  JSON.stringify(updated)
                );

              } catch (error) {

                console.error(
                  "Could not prepare result data:",
                  error
                );

              }

            }

            router.push(
              "/result"
            );
          }}
        >
          VIEW ANALYSIS →
        </motion.button>


      </section>


      {/* =============================================
          STYLES
      ============================================= */}

      <style jsx>{`

        * {
          box-sizing: border-box;
        }


        /* =========================================
           PAGE
        ========================================= */

        .processing-page {
          min-height: 100vh;

          background: #f5d547;

          color: #3b2414;

          font-family:
            "Courier New",
            monospace;

          position: relative;

          overflow-x: hidden;

          padding-bottom: 60px;
        }


        /* =========================================
           DITHER
        ========================================= */

        .dither {
          position: fixed;

          inset: 0;

          pointer-events: none;

          opacity: 0.12;

          background-image:
            radial-gradient(
              #3b2414 0.8px,
              transparent 0.8px
            );

          background-size:
            6px 6px;

          z-index: 0;
        }


        /* =========================================
           HEADER
        ========================================= */

        .processing-header {
          height: 72px;

          border-bottom:
            4px solid #3b2414;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          padding:
            0 35px;

          position: relative;

          z-index: 2;
        }


        .mini-logo {
          background:
            #3b2414;

          color:
            #f5d547;

          border:
            3px solid #3b2414;

          padding:
            8px 14px;

          font-family:
            inherit;

          font-size:
            22px;

          font-weight:
            900;

          cursor:
            pointer;

          box-shadow:
            4px 4px 0 #789b35;

          transition:
            0.15s;
        }


        .mini-logo:hover {
          transform:
            translate(
              2px,
              2px
            );

          box-shadow:
            2px 2px 0 #789b35;
        }


        .analysis-number {
          font-size:
            11px;

          font-weight:
            900;

          letter-spacing:
            1px;
        }


        /* =========================================
           CONTENT
        ========================================= */

        .processing-content {
          width:
            min(
              1200px,
              calc(100% - 32px)
            );

          margin:
            0 auto;

          position:
            relative;

          z-index:
            1;

          padding-top:
            45px;
        }


        /* =========================================
           TITLE
        ========================================= */

        .processing-title {
          text-align:
            center;

          font-size:
            clamp(
              30px,
              5vw,
              55px
            );

          letter-spacing:
            -3px;

          margin:
            0 0 45px;

          font-weight:
            900;
        }


        /* =========================================
           VISUAL AREA
        ========================================= */

        .visual-area {
          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          gap:
            45px;

          min-height:
            470px;

          position:
            relative;
        }


        /* =========================================
           BANANA PANEL
        ========================================= */

        .banana-panel {
          position:
            relative;

          width:
            520px;

          height:
            400px;

          border:
            5px solid #3b2414;

          background:
            #ead05a;

          box-shadow:
            8px 8px 0 #3b2414;

          overflow:
            hidden;

          flex-shrink:
            0;
        }


        .uploaded-banana {
          width:
            100%;

          height:
            100%;

          object-fit:
            contain;

          display:
            block;
        }


        .image-placeholder {
          width:
            100%;

          height:
            100%;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          font-size:
            80px;
        }


        /* =========================================
           SVG OVERLAY
        ========================================= */

        .banana-overlay {
          position:
            absolute;

          inset:
            0;

          width:
            100%;

          height:
            100%;

          pointer-events:
            none;

          z-index:
            5;
        }


        /* =========================================
           CONTOUR
        ========================================= */

        .banana-outline {
          stroke:
            #3b2414;

          stroke-width:
            5;

          fill:
            none;

          stroke-linecap:
            round;

          stroke-linejoin:
            round;
        }


        /* =========================================
           CENTRELINE
        ========================================= */

        .centre-line {
          stroke:
            #789b35;

          stroke-width:
            6;

          fill:
            none;

          stroke-linecap:
            round;

          stroke-linejoin:
            round;
        }


        /* =========================================
           CENTRELINE POINTS
        ========================================= */

        .math-point {
          fill:
            #3b2414;

          stroke:
            #f8e477;

          stroke-width:
            1.5;
        }


        /* =========================================
           MAX CURVATURE POINT
        ========================================= */

        .curvature-point {
          fill:
            #789b35;

          stroke:
            #3b2414;

          stroke-width:
            4;
        }


        /* =========================================
           GRAPH
        ========================================= */

        .graph-panel {
          width:
            600px;

          max-width:
            100%;

          background:
            #f8e477;

          border:
            5px solid #3b2414;

          box-shadow:
            8px 8px 0 #3b2414;

          padding:
            15px;

          flex-shrink:
            1;
        }


        .graph-label {
          font-size:
            11px;

          font-weight:
            900;

          letter-spacing:
            2px;

          margin-bottom:
            8px;
        }


        .graph {
          width:
            100%;

          height:
            auto;

          display:
            block;
        }


        /* =========================================
           STATUS
        ========================================= */

        .status-area {
          width:
            min(
              900px,
              100%
            );

          margin:
            40px auto 0;

          text-align:
            center;
        }


        .status-text {
          min-height:
            22px;

          font-size:
            12px;

          font-weight:
            900;

          letter-spacing:
            1px;
        }


        .progress-track {
          height:
            10px;

          border:
            3px solid #3b2414;

          margin-top:
            12px;

          background:
            #f8e477;
        }


        .progress-bar {
          height:
            100%;

          background:
            #789b35;
        }


        /* =========================================
           EQUATION
        ========================================= */

        .equation-container {
          width:
            min(
              900px,
              100%
            );

          margin:
            30px auto 0;
        }


        .equation-label {
          font-size:
            10px;

          font-weight:
            900;

          letter-spacing:
            2px;

          margin-bottom:
            8px;
        }


        .equation {
          border:
            4px solid #3b2414;

          background:
            #f8e477;

          padding:
            18px;

          font-size:
            18px;

          font-weight:
            900;

          overflow-x:
            auto;

          white-space:
            nowrap;

          box-shadow:
            5px 5px 0 #3b2414;
        }


        /* =========================================
           CURVATURE
        ========================================= */

        .curvature-result {
          width:
            min(
              900px,
              100%
            );

          margin:
            25px auto 0;

          border:
            4px solid #3b2414;

          background:
            #789b35;

          color:
            #f8e477;

          padding:
            18px 22px;

          display:
            flex;

          justify-content:
            space-between;

          align-items:
            center;

          box-shadow:
            5px 5px 0 #3b2414;
        }


        .curvature-result span {
          font-size:
            10px;

          font-weight:
            900;

          letter-spacing:
            2px;
        }


        .curvature-result strong {
          font-size:
            22px;
        }


        /* =========================================
           RESULT BUTTON
        ========================================= */

        .results-button {
          display:
            block;

          width:
            min(
              900px,
              100%
            );

          margin:
            35px auto 0;

          padding:
            18px;

          border:
            4px solid #3b2414;

          background:
            #3b2414;

          color:
            #f5d547;

          font-family:
            inherit;

          font-size:
            14px;

          font-weight:
            900;

          cursor:
            pointer;

          box-shadow:
            7px 7px 0 #789b35;

          transition:
            0.15s;
        }


        .results-button:hover {
          transform:
            translate(
              3px,
              3px
            );

          box-shadow:
            4px 4px 0 #789b35;
        }


        .results-button:active {
          transform:
            translate(
              7px,
              7px
            );

          box-shadow:
            0 0 0 #789b35;
        }


        /* =========================================
           MOBILE
        ========================================= */

        @media (max-width: 950px) {

          .visual-area {
            flex-direction:
              column;

            gap:
              35px;
          }


          .banana-panel {
            width:
              min(
                700px,
                100%
              );

            height:
              420px;
          }


          .graph-panel {
            width:
              min(
                700px,
                100%
              );
          }

        }


        @media (max-width: 650px) {

          .processing-header {
            padding:
              0 15px;
          }


          .processing-content {
            width:
              calc(
                100% - 24px
              );

            padding-top:
              30px;
          }


          .processing-title {
            font-size:
              32px;

            letter-spacing:
              -2px;

            margin-bottom:
              30px;
          }


          .banana-panel {
            width:
              100%;

            height:
              300px;
          }


          .graph-panel {
            padding:
              10px;
          }


          .equation {
            font-size:
              13px;
          }


          .curvature-result {
            flex-direction:
              column;

            gap:
              10px;

            text-align:
              center;
          }

        }

      `}</style>

    </main>
  );
}


/* =================================================
   ANIMATED POLYLINE
================================================= */

function AnimatedPolyline({
  points,
  className,
  visible,
  duration,
}: {
  points: Point[];
  className: string;
  visible: boolean;
  duration: number;
}) {

  const path = useMemo(() => {

    if (
      !points ||
      points.length === 0
    ) {
      return "";
    }

    return points
      .map(
        ([x, y], index) =>
          `${
            index === 0
              ? "M"
              : "L"
          } ${x} ${y}`
      )
      .join(" ");

  }, [points]);


  return (
    <motion.path
      d={path}
      className={className}

      fill="none"

      initial={{
        pathLength: 0,
        opacity: 0,
      }}

      animate={{
        pathLength:
          visible
            ? 1
            : 0,

        opacity:
          visible
            ? 1
            : 0,
      }}

      transition={{

        pathLength: {
          duration,

          ease:
            "easeInOut",
        },

        opacity: {
          duration:
            0.2,
        },

      }}
    />
  );
}


/* =================================================
   GRAPH
================================================= */

function Graph({
  data,
  stage,
}: {
  data: AnalysisData;
  stage: number;
}) {

  const graphWidth = 600;
  const graphHeight = 400;

  const padding = 50;


  /* ===============================================
     COLLECT POINTS
  =============================================== */

  const allPoints = [
    ...data.centrelinePoints,
    ...data.polynomialPoints,
  ];


  if (allPoints.length === 0) {

    return (
      <div className="graph-panel">

        <div className="graph-label">
          CENTRELINE DATA
        </div>

        <div
          style={{
            height: "300px",

            display: "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            fontWeight: 900,
          }}
        >
          NO GRAPH DATA
        </div>

        <style jsx>{`

          .graph-panel {
            width:
              600px;

            max-width:
              100%;

            background:
              #f8e477;

            border:
              5px solid #3b2414;

            box-shadow:
              8px 8px 0 #3b2414;

            padding:
              15px;
          }

          .graph-label {
            font-size:
              11px;

            font-weight:
              900;

            letter-spacing:
              2px;
          }

        `}</style>

      </div>
    );
  }


  /* ===============================================
     FIND BOUNDS
  =============================================== */

  const xs =
    allPoints.map(
      ([x]) => x
    );

  const ys =
    allPoints.map(
      ([, y]) => y
    );


  const minX =
    Math.min(...xs);

  const maxX =
    Math.max(...xs);

  const minY =
    Math.min(...ys);

  const maxY =
    Math.max(...ys);


  /* ===============================================
     SCALE
  =============================================== */

  const xScale =
    (graphWidth -
      padding * 2) /
    (maxX - minX || 1);


  const yScale =
    (graphHeight -
      padding * 2) /
    (maxY - minY || 1);


  /* ===============================================
     CONVERT TO GRAPH
  =============================================== */

  const toGraphX =
    (x: number) =>
      padding +
      (x - minX) *
        xScale;


  const toGraphY =
    (y: number) =>
      graphHeight -
      padding -
      (y - minY) *
        yScale;


  /* ===============================================
     CENTRELINE GRAPH POINTS
  =============================================== */

  const graphPoints =
    data.centrelinePoints.map(
      ([x, y]) => ({
        x: toGraphX(x),

        y: toGraphY(y),
      })
    );


  /* ===============================================
     POLYNOMIAL PATH
  =============================================== */

  const polynomialPath =
    data.polynomialPoints
      .map(
        ([x, y], index) =>
          `${
            index === 0
              ? "M"
              : "L"
          } ${
            toGraphX(x)
          } ${
            toGraphY(y)
          }`
      )
      .join(" ");


  return (
    <motion.div
      className="graph-panel"

      initial={{
        opacity: 0,

        x: 200,
      }}

      animate={{
        opacity:
          stage >= 3
            ? 1
            : 0,

        x:
          stage >= 3
            ? 0
            : 200,
      }}

      transition={{
        duration: 1,

        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
    >

      <div className="graph-label">
        CENTRELINE DATA
      </div>


      <svg
        className="graph"

        viewBox={`0 0 ${
          graphWidth
        } ${
          graphHeight
        }`}
      >


        {/* =====================================
            GRID
        ===================================== */}

        {Array.from({
          length: 13,
        }).map((_, i) => {

          const x =
            padding +
            i *
              (
                (
                  graphWidth -
                  padding * 2
                ) / 12
              );

          return (
            <line
              key={
                `v-${i}`
              }

              x1={x}

              y1={padding}

              x2={x}

              y2={
                graphHeight -
                padding
              }

              className="grid-line"
            />
          );
        })}


        {Array.from({
          length: 9,
        }).map((_, i) => {

          const y =
            padding +
            i *
              (
                (
                  graphHeight -
                  padding * 2
                ) / 8
              );

          return (
            <line
              key={
                `h-${i}`
              }

              x1={padding}

              y1={y}

              x2={
                graphWidth -
                padding
              }

              y2={y}

              className="grid-line"
            />
          );
        })}


        {/* =====================================
            AXES
        ===================================== */}

        <line
          x1={padding}

          y1={
            graphHeight -
            padding
          }

          x2={
            graphWidth -
            padding
          }

          y2={
            graphHeight -
            padding
          }

          className="axis"
        />


        <line
          x1={padding}

          y1={padding}

          x2={padding}

          y2={
            graphHeight -
            padding
          }

          className="axis"
        />


        {/* =====================================
            REAL CENTRELINE POINTS
        ===================================== */}

        {graphPoints.map(
          (
            point,
            index
          ) => (

            <motion.circle
              key={
                `graph-${index}`
              }

              cx={
                point.x
              }

              cy={
                point.y
              }

              r="4"

              className="graph-point"

              initial={{
                scale: 0,

                opacity: 0,
              }}

              animate={{
                scale:
                  stage >= 4
                    ? 1
                    : 0,

                opacity:
                  stage >= 4
                    ? 1
                    : 0,
              }}

              transition={{
                delay:
                  index *
                  0.012,

                duration:
                  0.25,
              }}
            />

          )
        )}


        {/* =====================================
            POLYNOMIAL
        ===================================== */}

        <motion.path
          d={
            polynomialPath
          }

          className="fitted-curve"

          fill="none"

          initial={{
            pathLength: 0,

            opacity: 0,
          }}

          animate={{
            pathLength:
              stage >= 4
                ? 1
                : 0,

            opacity:
              stage >= 4
                ? 1
                : 0,
          }}

          transition={{
            pathLength: {
              duration: 2,

              ease:
                "easeInOut",
            },
          }}
        />

      </svg>


      {/* =========================================
          GRAPH STYLES
      ========================================= */}

      <style jsx>{`

        .graph-panel {
          width:
            600px;

          max-width:
            100%;

          background:
            #f8e477;

          border:
            5px solid #3b2414;

          box-shadow:
            8px 8px 0 #3b2414;

          padding:
            15px;
        }


        .graph-label {
          font-size:
            11px;

          font-weight:
            900;

          letter-spacing:
            2px;

          margin-bottom:
            8px;
        }


        .graph {
          width:
            100%;

          height:
            auto;

          display:
            block;
        }


        .grid-line {
          stroke:
            #3b2414;

          stroke-width:
            1;

          stroke-dasharray:
            3 5;

          opacity:
            0.18;
        }


        .axis {
          stroke:
            #3b2414;

          stroke-width:
            3;
        }


        .graph-point {
          fill:
            #3b2414;
        }


        .fitted-curve {
          stroke:
            #789b35;

          stroke-width:
            5;

          stroke-linecap:
            round;
        }

      `}</style>

    </motion.div>
  );
}


/* =================================================
   EQUATION TYPING ANIMATION
================================================= */

function Equation({
  text,
}: {
  text: string;
}) {

  return (
    <span>

      {text
        .split("")
        .map(
          (
            char,
            index
          ) => (

            <motion.span
              key={index}

              initial={{
                opacity: 0,
              }}

              animate={{
                opacity: 1,
              }}

              transition={{
                delay:
                  index *
                  0.035,
              }}
            >
              {char}
            </motion.span>

          )
        )}

    </span>
  );
}