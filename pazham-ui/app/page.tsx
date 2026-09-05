"use client";

import { ChangeEvent } from "react";

export default function Home() {
  const handleUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      // Create form data for the Flask backend
        const formData = new FormData();
        formData.append("image", file);

        console.log("SELECTED FILE:", file);
        console.log("FORMDATA IMAGE:", formData.get("image"));

      // Save image preview + filename
      const previewUrl = URL.createObjectURL(file);

      sessionStorage.setItem(
        "bananaPreview",
        previewUrl
      );

      sessionStorage.setItem(
        "bananaFileName",
        file.name
      );

      console.log("Uploading:", file.name);
      console.log("Sending image to PAZHAM backend...");

      // Send image to Render backend
      const response = await fetch(
        "https://pazham-backend.onrender.com/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      console.log(
        "Backend response status:",
        response.status
      );

      // Try to read the JSON response
      const data = await response.json();

      console.log(
        "PAZHAM analysis received:",
        data
      );

      // Handle backend errors
      if (!response.ok) {
        throw new Error(
          data.error || "Analysis failed"
        );
      }

      console.log(
        "PAZHAM score:",
        data.score
      );

      console.log(
        "PAZHAM turning degrees:",
        data.totalTurningDegrees
      );

      // Store the analysis needed by the processing page
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

        // Support both spellings
        polynomialCentre:
          data.polynomialCentre ??
          data.polynomialCenter,

        polynomialCenter:
          data.polynomialCenter ??
          data.polynomialCentre,

        polynomialScale: data.polynomialScale,
        coefficients: data.coefficients,
        polynomial: data.polynomial,
        equation: data.equation,

        // Points for graphs
        outlinePoints: data.outlinePoints,
        centrelinePoints: data.centrelinePoints,
        polynomialPoints: data.polynomialPoints,

        // Curvature information
        maxCurvaturePoint:
          data.maxCurvaturePoint,

        // Debug information
        debug: data.debug,
      };

      /*
       * Store the analysis for /processing.
       *
       * IMPORTANT:
       * If this fails with QuotaExceededError,
       * the backend worked but sessionStorage is
       * too large. The console will now show the
       * exact error.
       */
      try {
        sessionStorage.setItem(
          "bananaAnalysis",
          JSON.stringify(analysisForProcessing)
        );
      } catch (storageError) {
        console.error(
          "Failed to save banana analysis:",
          storageError
        );

        alert(
          "The banana was analyzed, but the result was too large to store in the browser."
        );

        return;
      }

      console.log(
        "Analysis saved successfully."
      );

      // Move to processing page
      window.location.href = "/processing";
    } catch (error) {
      console.error(
        "PAZHAM upload/analysis error:",
        error
      );

      if (error instanceof Error) {
        alert(
          `Could not analyze the banana.\n\n${error.message}`
        );
      } else {
        alert(
          "Could not analyze the banana."
        );
      }
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

