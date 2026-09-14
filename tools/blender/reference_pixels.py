"""Read the supplied mascot PNGs exactly and measure their source coordinates.

No image is generated or changed. RGB samples are decoded directly from PNG
bytes, avoiding a Blender sRGB/linear round trip. Coordinates are top-first image
pixels; factor converts pixel distances to a 1.38-unit-wide modeled head.
"""
import os
import struct
import zlib

import numpy as np

SOURCE_FILES = {
    "lido": "Lido vs2.ai.png",
    "prena": "Prena.ai.png",
    "oty": "Oty.ai.png",
    "diva": "Diva.ai.png",
}


def read_rgb_png(path):
    """Decode non-interlaced RGB/RGBA8 PNG samples without color conversion."""
    with open(path, "rb") as stream:
        data = stream.read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Not a PNG: " + path)
    width = height = channels = None
    compressed = []
    offset = 8
    while offset < len(data):
        length, chunk = struct.unpack_from(">I4s", data, offset)
        payload = data[offset + 8:offset + 8 + length]
        if len(payload) != length:
            raise ValueError("Truncated PNG: " + path)
        if chunk == b"IHDR":
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            if depth != 8 or color not in (2, 6) or compression or filtering or interlace:
                raise ValueError("Reference artwork must be a non-interlaced RGB/RGBA8 PNG: " + path)
            channels = 3 if color == 2 else 4
        elif chunk == b"IDAT":
            compressed.append(payload)
        elif chunk == b"IEND":
            break
        offset += length + 12
    if not width or not height or not channels:
        raise ValueError("PNG has no supported image header: " + path)
    stride = width * channels
    raw = zlib.decompress(b"".join(compressed))
    if len(raw) != height * (stride + 1):
        raise ValueError("Unexpected PNG scanline size: " + path)
    pixels = np.empty((height, stride), dtype=np.uint8)
    previous = np.zeros(stride, dtype=np.uint8)
    for y in range(height):
        start = y * (stride + 1)
        filtering = raw[start]
        encoded = np.frombuffer(raw, dtype=np.uint8, count=stride, offset=start + 1)
        if filtering == 0:
            row = encoded.copy()
        elif filtering == 1:
            row = encoded.copy()
            for channel in range(channels):
                row[channel::channels] = np.cumsum(row[channel::channels], dtype=np.uint64).astype(np.uint8)
        elif filtering == 2:
            row = np.add(encoded, previous, dtype=np.uint8)
        elif filtering in (3, 4):
            row = bytearray(encoded.tobytes())
            above = previous.tolist()
            for x in range(stride):
                left = row[x - channels] if x >= channels else 0
                up = above[x]
                if filtering == 3:
                    predictor = (left + up) // 2
                else:
                    upper_left = above[x - channels] if x >= channels else 0
                    estimate = left + up - upper_left
                    left_distance = abs(estimate - left)
                    up_distance = abs(estimate - up)
                    diagonal_distance = abs(estimate - upper_left)
                    predictor = left if left_distance <= up_distance and left_distance <= diagonal_distance else up if up_distance <= diagonal_distance else upper_left
                row[x] = (row[x] + predictor) & 255
            row = np.frombuffer(row, dtype=np.uint8)
        else:
            raise ValueError("Unknown PNG scanline filter: " + str(filtering))
        pixels[y] = row
        previous = pixels[y]
    return pixels.reshape(height, width, channels)[:, :, :3].copy()


def measure_head(mask):
    """Fit the clear left/right ellipse outline below the supplied head crowns.

    The center band lies safely below bulbs, stars, gears and puzzle pieces and
    above the shoulders in all four supplied standing references. Fitting squared
    half-width against row position uses both ellipse sides and avoids choosing
    an arbitrary last row from a quantized maximum-width plateau.
    """
    height, image_width = mask.shape
    rows = np.arange(round(height * .235), round(height * .305) + 1)
    bands = mask[rows]
    populated = bands.any(axis=1)
    rows = rows[populated]
    bands = bands[populated]
    if len(rows) < 12:
        raise ValueError("Reference has no measurable round head outline")
    left = bands.argmax(axis=1).astype(float)
    right = (image_width - 1 - bands[:, ::-1].argmax(axis=1)).astype(float)
    widths = right - left
    width = float(widths.max())
    close_to_center = widths >= width * .94
    rows = rows[close_to_center]
    left = left[close_to_center]
    right = right[close_to_center]
    widths = right - left
    row_origin = float(rows.mean())
    y = rows.astype(float) - row_origin
    half_width_squared = (widths * .5) ** 2
    coefficients = np.polyfit(y, half_width_squared, 2)
    # Reject isolated protrusions/edge anomalies rather than letting a crown
    # detail shift the measured head center.
    residual = half_width_squared - np.polyval(coefficients, y)
    median = float(np.median(residual))
    robust_sigma = float(np.median(np.abs(residual - median))) * 1.4826
    inliers = np.abs(residual - median) <= max(robust_sigma * 3, width * .4)
    if inliers.sum() >= 12:
        coefficients = np.polyfit(y[inliers], half_width_squared[inliers], 2)
    quadratic, slope, intercept = (float(value) for value in coefficients)
    if quadratic >= 0:
        raise ValueError("Reference head outline does not fit an ellipse")
    cy = row_origin - slope / (2 * quadratic)
    fitted_rx_squared = intercept - slope * slope / (4 * quadratic)
    fitted_ry = float(np.sqrt(-fitted_rx_squared / quadratic))
    # Use the observed pixel span for consistent source-to-model scale. The
    # quadratic fit supplies the center and vertical-to-horizontal radius ratio.
    rx_pixels = width * .5
    ry_ratio = fitted_ry / float(np.sqrt(fitted_rx_squared))
    ry_pixels = rx_pixels * ry_ratio
    cx = float(np.median(((left + right) * .5)[inliers]))
    if not (rows.min() - 5 <= cy <= rows.max() + 5 and .75 <= ry_ratio <= 1.15):
        raise ValueError(f"Unreliable head fit: center={cy:.2f}, vertical ratio={ry_ratio:.3f}")
    plateau = rows[widths == width]
    return {
        "cx": cx,
        "cy": cy,
        "width": width,
        "rx_pixels": rx_pixels,
        "ry_pixels": ry_pixels,
        "ry_ratio": ry_ratio,
        "plateau_cy": float(plateau.mean()),
        "plateau_rows": (int(plateau.min()), int(plateau.max())),
    }


def load_art(api, name):
    """Return exact RGB, foreground mask, and shared source-to-model coordinates.

    rgb: uint8 [row, column, RGB], with row zero at the image top.
    mask: foreground where the minimum RGB channel is below 245.
    cx/cy, width, floor: original image pixel coordinates and distances.
    factor: 1.38 / width, in world units per pixel.
    ry_pixels / ry_ratio: fitted vertical radius and vertical/horizontal ratio.
    ry: fitted vertical radius in world units (ready for a Blender ellipsoid).
    """
    root = getattr(api, "ROOT", os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
    path = os.path.join(root, "public", "characters", "source", SOURCE_FILES[name])
    rgb = read_rgb_png(path)
    mask = rgb.min(axis=2) < 245
    foreground_rows = np.flatnonzero(mask.any(axis=1))
    if not foreground_rows.size:
        raise ValueError("Reference is blank: " + path)
    measurements = measure_head(mask)
    factor = 1.38 / measurements["width"]
    return {
        "rgb": rgb,
        "mask": mask,
        **measurements,
        "factor": factor,
        "floor": int(foreground_rows[-1]),
        "ry": measurements["ry_pixels"] * factor,
        "filename": SOURCE_FILES[name],
        "source": path,
    }
