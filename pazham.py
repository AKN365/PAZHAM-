from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import cv2
import numpy as np
import math
import traceback


# ============================================================
# PAZHAM 9.0
# Robust contour-based banana centreline extraction
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# CONFIG
# ============================================================

HSV_LOWER = np.array([10, 35, 25], dtype=np.uint8)
HSV_UPPER = np.array([45, 255, 255], dtype=np.uint8)

POLY_DEGREE = 4

CENTRELINE_POINTS = 300
GRAPH_POINTS = 500

SMOOTHING_WINDOW = 15

MIN_BANANA_AREA = 500


# ============================================================
# BASIC HELPERS
# ============================================================

def odd_window(value, minimum=3):
    value = int(value)

    if value < minimum:
        value = minimum

    if value % 2 == 0:
        value += 1

    return value


def smooth_values(values, window=15):
    """
    Moving-average smoothing that preserves array length.
    """
    values = np.asarray(values, dtype=float)

    if len(values) < 5:
        return values.copy()

    window = odd_window(window)

    if window >= len(values):
        window = len(values) - 1

    if window < 3:
        return values.copy()

    if window % 2 == 0:
        window -= 1

    kernel = np.ones(window, dtype=float) / window

    pad = window // 2

    padded = np.pad(
        values,
        (pad, pad),
        mode="edge"
    )

    smoothed = np.convolve(
        padded,
        kernel,
        mode="valid"
    )

    return smoothed


def remove_duplicate_points(points, min_distance=1.0):
    """
    Remove points that are extremely close together.
    """
    points = np.asarray(points, dtype=float)

    if len(points) == 0:
        return points

    output = [points[0]]

    for point in points[1:]:
        distance = np.linalg.norm(point - output[-1])

        if distance >= min_distance:
            output.append(point)

    return np.asarray(output, dtype=float)


# ============================================================
# IMAGE SEGMENTATION
# ============================================================

def segment_banana(image):
    """
    Segment banana using HSV thresholding and morphological cleanup.
    Returns a clean binary mask and largest contour.
    """

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    mask = cv2.inRange(
        hsv,
        HSV_LOWER,
        HSV_UPPER
    )

    # Remove small isolated noise
    open_kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (5, 5)
    )

    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_OPEN,
        open_kernel
    )

    # Close small holes/gaps inside banana
    close_kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (11, 11)
    )

    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_CLOSE,
        close_kernel
    )

    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_NONE
    )

    if not contours:
        raise ValueError(
            "No banana contour was detected."
        )

    contour = max(
        contours,
        key=cv2.contourArea
    )

    area = cv2.contourArea(contour)

    if area < MIN_BANANA_AREA:
        raise ValueError(
            "Detected object is too small to be a banana."
        )

    clean_mask = np.zeros_like(mask)

    cv2.drawContours(
        clean_mask,
        [contour],
        -1,
        255,
        thickness=cv2.FILLED
    )

    return clean_mask, contour, float(area)


# ============================================================
# PCA COORDINATE SYSTEM
# ============================================================

def calculate_pca_axes(points):
    """
    Calculate principal direction and perpendicular direction.

    Coordinates are standard image coordinates:
        x -> right
        y -> down
    """

    points = np.asarray(points, dtype=float)

    mean = np.mean(points, axis=0)

    centered = points - mean

    covariance = np.cov(
        centered.T
    )

    eigenvalues, eigenvectors = np.linalg.eigh(
        covariance
    )

    order = np.argsort(eigenvalues)[::-1]

    direction = eigenvectors[:, order[0]]

    # Make direction deterministic
    if direction[0] < 0:
        direction = -direction

    perpendicular = np.array(
        [-direction[1], direction[0]],
        dtype=float
    )

    perpendicular /= (
        np.linalg.norm(perpendicular) + 1e-12
    )

    direction /= (
        np.linalg.norm(direction) + 1e-12
    )

    return mean, direction, perpendicular


def project_points(points, origin, direction, perpendicular):
    """
    Convert image coordinates into PCA coordinates.

    u = longitudinal direction
    v = transverse direction
    """

    points = np.asarray(points, dtype=float)

    relative = points - origin

    u = relative @ direction
    v = relative @ perpendicular

    return np.column_stack((u, v))


def unproject_points(
    uv_points,
    origin,
    direction,
    perpendicular
):
    """
    Convert PCA coordinates back into image coordinates.
    """

    uv_points = np.asarray(
        uv_points,
        dtype=float
    )

    return (
        origin
        + np.outer(uv_points[:, 0], direction)
        + np.outer(uv_points[:, 1], perpendicular)
    )


# ============================================================
# FOREGROUND RUN DETECTION
# ============================================================

def find_contiguous_runs(values, gap=1.5):
    """
    Given transverse coordinates belonging to one longitudinal
    column, split them into contiguous foreground runs.

    Example:

        [10,11,12,13, 30,31,32]

    becomes:

        [(10,13), (30,32)]
    """

    if len(values) == 0:
        return []

    values = np.sort(
        np.asarray(values, dtype=float)
    )

    runs = []

    start = values[0]
    previous = values[0]

    for value in values[1:]:

        if value - previous > gap:
            runs.append(
                (start, previous)
            )

            start = value

        previous = value

    runs.append(
        (start, previous)
    )

    return runs


# ============================================================
# ROBUST CONTOUR / CENTRELINE EXTRACTION
# ============================================================

def extract_robust_centreline(
    mask,
    contour,
    target_points=300
):
    """
    Robust banana centreline extraction.

    Algorithm:

    1. Calculate PCA orientation.
    2. Project banana pixels into PCA coordinates.
    3. Scan longitudinally through the banana.
    4. For each column, find contiguous foreground regions.
    5. Track the most plausible region continuously.
    6. Use the midpoint of the selected region as the centreline.
    7. Smooth and resample by arc length.

    This avoids the old "average everything in a row" problem.
    """

    # --------------------------------------------------------
    # Banana pixels
    # --------------------------------------------------------

    ys, xs = np.where(mask > 0)

    if len(xs) < 100:
        raise ValueError(
            "Not enough banana pixels for centreline extraction."
        )

    pixels = np.column_stack(
        (
            xs.astype(float),
            ys.astype(float)
        )
    )

    # --------------------------------------------------------
    # PCA coordinate system
    # --------------------------------------------------------

    origin, direction, perpendicular = calculate_pca_axes(
        pixels
    )

    uv = project_points(
        pixels,
        origin,
        direction,
        perpendicular
    )

    u_values = uv[:, 0]
    v_values = uv[:, 1]

    u_min = float(np.min(u_values))
    u_max = float(np.max(u_values))

    length = u_max - u_min

    if length < 20:
        raise ValueError(
            "Banana is too small or too compressed for centreline extraction."
        )

    # --------------------------------------------------------
    # Longitudinal bins
    # --------------------------------------------------------

    # Use approximately one-pixel bins where possible.
    number_of_columns = int(
        max(
            80,
            min(
                700,
                round(length)
            )
        )
    )

    bins = np.linspace(
        u_min,
        u_max,
        number_of_columns
    )

    bin_width = (
        bins[1] - bins[0]
        if len(bins) > 1
        else 1.0
    )

    # --------------------------------------------------------
    # Build candidate centre points
    # --------------------------------------------------------

    candidates = []

    for i, center_u in enumerate(bins):

        lower = center_u - bin_width * 0.8
        upper = center_u + bin_width * 0.8

        selection = (
            (u_values >= lower)
            &
            (u_values <= upper)
        )

        transverse = v_values[selection]

        if len(transverse) < 3:
            candidates.append([])

            continue

        runs = find_contiguous_runs(
            transverse,
            gap=2.0
        )

        column_candidates = []

        for run_start, run_end in runs:

            width = run_end - run_start

            # Ignore tiny isolated noise fragments
            if width < 2.0:
                continue

            center_v = (
                run_start + run_end
            ) / 2.0

            column_candidates.append(
                {
                    "u": center_u,
                    "v": center_v,
                    "width": width,
                    "start": run_start,
                    "end": run_end
                }
            )

        candidates.append(
            column_candidates
        )

    # --------------------------------------------------------
    # Track the centreline through the candidate regions
    # --------------------------------------------------------

    tracked = []

    previous_v = None

    for i, column in enumerate(candidates):

        if not column:
            continue

        # ----------------------------------------------------
        # First usable column
        # ----------------------------------------------------

        if previous_v is None:

            # Prefer the widest real banana region.
            selected = max(
                column,
                key=lambda item: item["width"]
            )

        else:

            # ------------------------------------------------
            # Choose candidate closest to previous centre.
            #
            # A very wide candidate is still preferred,
            # but continuity is much more important.
            # ------------------------------------------------

            def candidate_cost(item):

                distance = abs(
                    item["v"] - previous_v
                )

                width_bonus = min(
                    item["width"],
                    30.0
                ) * 0.08

                return distance - width_bonus

            selected = min(
                column,
                key=candidate_cost
            )

        tracked.append(
            [
                selected["u"],
                selected["v"]
            ]
        )

        previous_v = selected["v"]

    if len(tracked) < 20:
        raise ValueError(
            "Could not track a continuous banana centreline."
        )

    tracked = np.asarray(
        tracked,
        dtype=float
    )

    # --------------------------------------------------------
    # Fill obvious longitudinal gaps
    # --------------------------------------------------------

    # Sort by longitudinal coordinate.
    tracked = tracked[
        np.argsort(tracked[:, 0])
    ]

    # Remove duplicate longitudinal coordinates.
    unique_u, unique_indices = np.unique(
        tracked[:, 0],
        return_index=True
    )

    tracked = tracked[
        unique_indices
    ]

    if len(tracked) < 10:
        raise ValueError(
            "Centreline contains too few unique points."
        )

    # --------------------------------------------------------
    # Smooth transverse movement.
    #
    # Important:
    # We smooth v against u, not x/y independently.
    # This preserves the banana's geometry much better.
    # --------------------------------------------------------

    u = tracked[:, 0]
    v = tracked[:, 1]

    window = min(
        SMOOTHING_WINDOW,
        len(v) - 1
    )

    if window >= 3:

        if window % 2 == 0:
            window -= 1

        v = smooth_values(
            v,
            window
        )

    smoothed_uv = np.column_stack(
        (
            u,
            v
        )
    )

    # --------------------------------------------------------
    # Convert back to image coordinates
    # --------------------------------------------------------

    centreline = unproject_points(
        smoothed_uv,
        origin,
        direction,
        perpendicular
    )

    # --------------------------------------------------------
    # Remove duplicates
    # --------------------------------------------------------

    centreline = remove_duplicate_points(
        centreline,
        min_distance=1.0
    )

    if len(centreline) < 10:
        raise ValueError(
            "Centreline collapsed after smoothing."
        )

    # --------------------------------------------------------
    # Sort consistently along PCA direction
    # --------------------------------------------------------

    projected_again = project_points(
        centreline,
        origin,
        direction,
        perpendicular
    )

    order = np.argsort(
        projected_again[:, 0]
    )

    centreline = centreline[
        order
    ]

    # --------------------------------------------------------
    # Arc-length resampling
    # --------------------------------------------------------

    centreline = resample_by_arclength(
        centreline,
        target_points
    )

    return centreline


# ============================================================
# ARC LENGTH RESAMPLING
# ============================================================

def resample_by_arclength(points, count=300):
    """
    Resample points uniformly by travelled distance.
    """

    points = np.asarray(
        points,
        dtype=float
    )

    if len(points) < 2:
        return points

    deltas = np.diff(
        points,
        axis=0
    )

    distances = np.sqrt(
        np.sum(
            deltas ** 2,
            axis=1
        )
    )

    cumulative = np.concatenate(
        (
            [0.0],
            np.cumsum(distances)
        )
    )

    total_length = cumulative[-1]

    if total_length <= 1e-8:
        return points

    count = int(
        max(
            2,
            min(
                count,
                len(points) * 3
            )
        )
    )

    target_distances = np.linspace(
        0,
        total_length,
        count
    )

    x = np.interp(
        target_distances,
        cumulative,
        points[:, 0]
    )

    y = np.interp(
        target_distances,
        cumulative,
        points[:, 1]
    )

    return np.column_stack(
        (
            x,
            y
        )
    )


# ============================================================
# CURVE LENGTH
# ============================================================

def calculate_curve_length(points):
    points = np.asarray(
        points,
        dtype=float
    )

    if len(points) < 2:
        return 0.0

    deltas = np.diff(
        points,
        axis=0
    )

    distances = np.sqrt(
        np.sum(
            deltas ** 2,
            axis=1
        )
    )

    return float(
        np.sum(distances)
    )


# ============================================================
# DIRECT CURVATURE
# ============================================================

def calculate_direct_curvature(centreline):
    """
    Calculate curvature directly from the extracted centreline.

    Formula:

        k = |x'y'' - y'x''|
            ----------------
            (x'^2 + y'^2)^(3/2)

    The calculation is independent of whether the banana is
    represented as y=f(x) or x=f(y).
    """

    points = np.asarray(
        centreline,
        dtype=float
    )

    if len(points) < 7:
        return np.zeros(
            len(points),
            dtype=float
        )

    x = points[:, 0]
    y = points[:, 1]

    dx = np.gradient(x)
    dy = np.gradient(y)

    ddx = np.gradient(dx)
    ddy = np.gradient(dy)

    numerator = np.abs(
        dx * ddy - dy * ddx
    )

    denominator = (
        dx ** 2
        + dy ** 2
    ) ** 1.5

    curvature = np.divide(
        numerator,
        denominator,
        out=np.zeros_like(numerator),
        where=denominator > 1e-12
    )

    curvature = np.nan_to_num(
        curvature,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    # Smooth curvature slightly so pixel-level noise doesn't
    # produce ridiculous spikes.
    curvature = smooth_values(
        curvature,
        9
    )

    # Ignore unstable ends.
    edge = min(
        5,
        len(curvature) // 10
    )

    if edge > 0:
        curvature[:edge] = np.nan
        curvature[-edge:] = np.nan

    finite = np.isfinite(
        curvature
    )

    if not np.any(finite):
        max_curvature = 0.0
    else:
        max_curvature = float(
            np.nanmax(curvature)
        )

    curvature = np.nan_to_num(
        curvature,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    return curvature


# ============================================================
# TANGENT / TOTAL TURNING
# ============================================================

def calculate_total_turning(centreline):
    """
    Calculate total absolute change in tangent angle.
    """

    points = np.asarray(
        centreline,
        dtype=float
    )

    if len(points) < 5:
        return 0.0

    x = points[:, 0]
    y = points[:, 1]

    dx = np.gradient(x)
    dy = np.gradient(y)

    angles = np.arctan2(
        dy,
        dx
    )

    angles = np.unwrap(
        angles
    )

    changes = np.diff(
        angles
    )

    # Ignore extremely tiny numerical fluctuations.
    changes[
        np.abs(changes) < 1e-5
    ] = 0.0

    # Ignore unstable endpoints.
    edge = min(
        5,
        len(changes) // 10
    )

    if edge > 0:
        changes = changes[
            edge:-edge
        ]

    return float(
        np.sum(
            np.abs(changes)
        )
    )


# ============================================================
# SCORE
# ============================================================

def calculate_score(total_turning_degrees):
    """
    Convert total tangent turning into a 0-100 banana score.

    Approximate behaviour:

        10°  -> 16.6
        20°  -> 30.5
        30°  -> 42.1
        45°  -> 55.8
        60°  -> 66.5
        90°  -> 80.5
        120° -> 88.7
        180° -> 96.2
    """

    degrees = max(
        0.0,
        float(total_turning_degrees)
    )

    score = (
        1.0
        - math.exp(
            -degrees / 55.0
        )
    ) * 100.0

    score = max(
        0.0,
        min(
            100.0,
            score
        )
    )

    return round(
        score,
        2
    )


# ============================================================
# POLYNOMIAL FIT
# ============================================================

def fit_polynomial(centreline):
    """
    Fit a polynomial while automatically choosing the better
    axis.

    If banana is mostly horizontal:

        y = f(x)

    Otherwise:

        x = f(y)
    """

    points = np.asarray(
        centreline,
        dtype=float
    )

    x = points[:, 0]
    y = points[:, 1]

    x_range = float(
        np.ptp(x)
    )

    y_range = float(
        np.ptp(y)
    )

    if x_range >= y_range:

        axis = "x"

        independent = x
        dependent = y

    else:

        axis = "y"

        independent = y
        dependent = x

    center = float(
        np.mean(independent)
    )

    scale = float(
        np.max(
            np.abs(
                independent - center
            )
        )
    )

    if scale < 1e-8:
        raise ValueError(
            "Polynomial scale is too small."
        )

    normalized = (
        independent - center
    ) / scale

    degree = min(
        POLY_DEGREE,
        len(points) - 1
    )

    coefficients = np.polyfit(
        normalized,
        dependent,
        degree
    )

    return (
        coefficients,
        axis,
        center,
        scale
    )


# ============================================================
# POLYNOMIAL EVALUATION
# ============================================================

def evaluate_polynomial(
    coefficients,
    axis,
    center,
    scale,
    count=500,
    independent_min=None,
    independent_max=None
):
    if independent_min is None:
        independent_min = center - scale

    if independent_max is None:
        independent_max = center + scale

    independent = np.linspace(
        independent_min,
        independent_max,
        count
    )

    u = (
        independent - center
    ) / scale

    dependent = np.polyval(
        coefficients,
        u
    )

    if axis == "x":

        x = independent
        y = dependent

    else:

        x = dependent
        y = independent

    return np.column_stack(
        (
            x,
            y
        )
    )


# ============================================================
# POLYNOMIAL EQUATION
# ============================================================

def format_number(value):
    if abs(value) < 1e-10:
        value = 0.0

    return f"{value:.6f}".rstrip("0").rstrip(".")


def polynomial_equation(
    coefficients,
    axis,
    center,
    scale
):
    """
    Create a readable polynomial equation.

    Note:
    The polynomial internally uses the normalized variable:

        u = (independent - center) / scale
    """

    terms = []

    degree = len(coefficients) - 1

    for index, coefficient in enumerate(
        coefficients
    ):

        power = degree - index

        if abs(coefficient) < 1e-10:
            continue

        sign = "+" if coefficient >= 0 else "-"

        magnitude = abs(
            coefficient
        )

        coefficient_text = format_number(
            magnitude
        )

        if power == 0:

            term = coefficient_text

        elif power == 1:

            if abs(magnitude - 1.0) < 1e-10:
                term = "u"
            else:
                term = f"{coefficient_text}u"

        else:

            if abs(magnitude - 1.0) < 1e-10:
                term = f"u^{power}"
            else:
                term = f"{coefficient_text}u^{power}"

        if not terms:

            if coefficient < 0:
                terms.append(
                    "- " + term
                )
            else:
                terms.append(
                    term
                )

        else:

            terms.append(
                f" {sign} {term}"
            )

    if not terms:
        expression = "0"
    else:
        expression = "".join(
            terms
        )

    if axis == "x":
        lhs = "y"
    else:
        lhs = "x"

    return (
        f"{lhs} = {expression}, "
        f"where u = ({axis} - {format_number(center)})"
        f" / {format_number(scale)}"
    )


# ============================================================
# OUTLINE POINTS
# ============================================================

def simplify_contour(
    contour,
    max_points=700
):
    """
    Downsample contour for JSON.
    """

    contour_points = contour.reshape(
        -1,
        2
    ).astype(float)

    if len(contour_points) <= max_points:
        return contour_points

    indices = np.linspace(
        0,
        len(contour_points) - 1,
        max_points
    ).astype(int)

    return contour_points[
        indices
    ]


# ============================================================
# JSON POINT CONVERSION
# ============================================================

def points_to_json(points):
    points = np.asarray(
        points,
        dtype=float
    )

    return [
        [
            round(float(point[0]), 2),
            round(float(point[1]), 2)
        ]
        for point in points
    ]


# ============================================================
# MAIN ANALYSIS
# ============================================================

def analyze_image(image):
    height, width = image.shape[:2]

    # --------------------------------------------------------
    # Segment
    # --------------------------------------------------------

    mask, contour, banana_area = segment_banana(
        image
    )

    # --------------------------------------------------------
    # Robust centreline
    # --------------------------------------------------------

    centreline = extract_robust_centreline(
        mask,
        contour,
        CENTRELINE_POINTS
    )

    if len(centreline) < 10:
        raise ValueError(
            "Centreline extraction failed."
        )

    # --------------------------------------------------------
    # Polynomial
    # --------------------------------------------------------

    (
        coefficients,
        polynomial_axis,
        polynomial_center,
        polynomial_scale
    ) = fit_polynomial(
        centreline
    )

    # --------------------------------------------------------
    # Determine polynomial range from centreline
    # --------------------------------------------------------

    if polynomial_axis == "x":

        independent_values = centreline[:, 0]

    else:

        independent_values = centreline[:, 1]

    independent_min = float(
        np.min(independent_values)
    )

    independent_max = float(
        np.max(independent_values)
    )

    polynomial_points = evaluate_polynomial(
        coefficients,
        polynomial_axis,
        polynomial_center,
        polynomial_scale,
        GRAPH_POINTS,
        independent_min,
        independent_max
    )

    # --------------------------------------------------------
    # Curvature
    # --------------------------------------------------------

    curvature = calculate_direct_curvature(
        centreline
    )

    if len(curvature) == 0:
        max_curvature = 0.0
        max_curvature_index = 0
    else:

        max_curvature_index = int(
            np.argmax(curvature)
        )

        max_curvature = float(
            curvature[
                max_curvature_index
            ]
        )

    average_curvature = float(
        np.mean(
            curvature
        )
    )

    # --------------------------------------------------------
    # Maximum curvature point
    # --------------------------------------------------------

    if len(centreline) > 0:

        max_curvature_point = centreline[
            max_curvature_index
        ]

    else:

        max_curvature_point = np.array(
            [0.0, 0.0]
        )

    # --------------------------------------------------------
    # Curve length
    # --------------------------------------------------------

    curve_length = calculate_curve_length(
        centreline
    )

    # --------------------------------------------------------
    # Total turning
    # --------------------------------------------------------

    total_turning = calculate_total_turning(
        centreline
    )

    total_turning_degrees = (
        math.degrees(
            total_turning
        )
    )

    # --------------------------------------------------------
    # Score
    # --------------------------------------------------------

    score = calculate_score(
        total_turning_degrees
    )

    # --------------------------------------------------------
    # Equation
    # --------------------------------------------------------

    equation = polynomial_equation(
        coefficients,
        polynomial_axis,
        polynomial_center,
        polynomial_scale
    )

    # --------------------------------------------------------
    # Outline
    # --------------------------------------------------------

    outline_points = simplify_contour(
        contour
    )

    # --------------------------------------------------------
    # Return compact analysis object
    # --------------------------------------------------------

    return {

        # Image information
        "imageWidth": int(width),
        "imageHeight": int(height),

        # Banana measurements
        "bananaArea": round(
            banana_area,
            2
        ),

        "curveLength": round(
            curve_length,
            2
        ),

        # Geometry
        "outlinePoints": points_to_json(
            outline_points
        ),

        "centrelinePoints": points_to_json(
            centreline
        ),

        "polynomialPoints": points_to_json(
            polynomial_points
        ),

        # Polynomial information
        "coefficients": [
            float(value)
            for value in coefficients
        ],

        "polynomial": [
            float(value)
            for value in coefficients
        ],

        "polynomialDegree": int(
            len(coefficients) - 1
        ),

        "polynomialAxis": polynomial_axis,

        "polynomialCenter": round(
            polynomial_center,
            6
        ),

        "polynomialScale": round(
            polynomial_scale,
            6
        ),

        "equation": equation,

        # Curvature
        "curvature": [
            round(float(value), 8)
            for value in curvature
        ],

        "maxCurvature": round(
            max_curvature,
            8
        ),

        "averageCurvature": round(
            average_curvature,
            8
        ),

        "maxCurvaturePoint": [
            round(
                float(max_curvature_point[0]),
                2
            ),
            round(
                float(max_curvature_point[1]),
                2
            )
        ],

        # Overall bending
        "totalTurningAngle": round(
            total_turning,
            6
        ),

        "totalTurningDegrees": round(
            total_turning_degrees,
            2
        ),

        "score": score,

        # Debug information
        "debug": {

            "bananaPixels": int(
                np.count_nonzero(mask)
            ),

            "contourArea": round(
                banana_area,
                2
            ),

            "centrelinePointCount": int(
                len(centreline)
            ),

            "polynomialPointCount": int(
                len(polynomial_points)
            ),

            "maxCurvature": round(
                max_curvature,
                8
            ),

            "averageCurvature": round(
                average_curvature,
                8
            ),

            "curveLength": round(
                curve_length,
                2
            ),

            "totalTurningDegrees": round(
                total_turning_degrees,
                2
            ),

            "score": score
        }
    }


# ============================================================
# FLASK API
# ============================================================

@app.route(
    "/analyze",
    methods=["POST"]
)
def analyze():

    try:

        if "image" not in request.files:

            return jsonify({
                "error": "No image uploaded."
            }), 400

        uploaded_file = request.files[
            "image"
        ]

        file_bytes = uploaded_file.read()

        if not file_bytes:

            return jsonify({
                "error": "Uploaded image is empty."
            }), 400

        image_array = np.frombuffer(
            file_bytes,
            dtype=np.uint8
        )

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if image is None:

            return jsonify({
                "error": "Could not decode uploaded image."
            }), 400

        result = analyze_image(
            image
        )

        print(
            "\n========================================"
        )
        print(
            "PAZHAM ANALYSIS"
        )
        print(
            "========================================"
        )
        print(
            f"Image: {image.shape[1]} x {image.shape[0]}"
        )
        print(
            f"Centreline points: {len(result['centrelinePoints'])}"
        )
        print(
            f"Curve length: {result['curveLength']}"
        )
        print(
            f"Max curvature: {result['maxCurvature']}"
        )
        print(
            f"Total turning: {result['totalTurningDegrees']}°"
        )
        print(
            f"Score: {result['score']}/100"
        )
        print(
            f"Equation: {result['equation']}"
        )
        print(
            "========================================\n"
        )

        return jsonify(result)

    except Exception as error:

        print(
            "\n========== PAZHAM ERROR =========="
        )

        print(
            str(error)
        )

        traceback.print_exc()

        print(
            "==================================\n"
        )

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route(
    "/",
    methods=["GET"]
)
def home():

    return jsonify({
        "status": "PAZHAM backend is running",
        "version": "9.0",
        "endpoint": "/analyze"
    })


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print(
        "=============================================="
    )
    print(
        "        PAZHAM BANANA ANALYZER v9.0"
    )
    print(
        "=============================================="
    )
    print(
        "Robust contour-based centreline extraction"
    )
    print(
        "Direct centreline curvature calculation"
    )
    print(
        "Server: http://localhost:5001"
    )
    print(
        "=============================================="
    )

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5001)),
        debug=False
    )
