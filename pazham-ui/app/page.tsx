"use client";

import { ChangeEvent } from "react";

export default function Home() {
  const handleUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    // Save preview + filename
    sessionStorage.setItem(
      "bananaPreview",
      URL.createObjectURL(file)
    );

    sessionStorage.setItem(
      "bananaFileName",
      file.name
    );

    try {
      const response = await fetch(
        "https://pazham-backend.onrender.com",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Analysis failed"
        );
      }

      // Store the COMPLETE analysis response
      // so the processing + result pages have
      // access to the score and curvature data.
      const analysisForProcessing = {
        success: data.success,

        // Main score
        score: data.score,
        verdict: data.verdict,

        // Banana measurements
        bananaArea: data.bananaArea,
        curveLength: data.curveLength,
        maxCurvature: data.maxCurvature,
        averageCurvature: data.averageCurvature,

        // Turning angle
        totalTurningAngle: data.totalTurningAngle,
        totalTurningDegrees: data.totalTurningDegrees,

        // Polynomial
        polynomialDegree: data.polynomialDegree,
        polynomialAxis: data.polynomialAxis,
        polynomialCentre: data.polynomialCentre,
        polynomialScale: data.polynomialScale,
        coefficients: data.coefficients,
        polynomial: data.polynomial,
        equation: data.equation,

        // Points for graphs
        outlinePoints: data.outlinePoints,
        centrelinePoints: data.centrelinePoints,
        polynomialPoints: data.polynomialPoints,

        // Curvature information
        maxCurvaturePoint: data.maxCurvaturePoint,

        // Debug information
        debug: data.debug,
      };

      console.log("PAZHAM analysis received:", data);
      console.log("PAZHAM score:", data.score);
      console.log(
        "PAZHAM turning degrees:",
        data.totalTurningDegrees
      );

      sessionStorage.setItem(
        "bananaAnalysis",
        JSON.stringify(analysisForProcessing)
      );

      window.location.href = "/processing";
    } catch (error) {
      console.error(error);

      alert(
        "Could not analyze the banana."
      );
    }
  };

  return (
    <main className="pazham">

      <h1 className="logo">
        PAZHAM
      </h1>

      <h2>
        HOW CURVED IS YOUR BANANA ?
      </h2>

      <label className="upload-box">

        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
        />

        <span>
          Upload a pic of your banana
        </span>

      </label>

    </main>
  );
}