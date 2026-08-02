"""
Virtual Line Crossing Counter with Hysteresis (Buffer Zone).

Tracks people crossing a defined line (IN vs OUT) using ByteTrack IDs.
Uses a buffer zone (hysteresis) to prevent false counts due to side-to-side jitter,
minor movements, or tracking fluctuations around the line.
"""
from __future__ import annotations
import math
from typing import Optional


def _side_of_line(
    point: tuple[float, float],
    line_start: tuple[int, int],
    line_end:   tuple[int, int],
) -> float:
    """
    Returns the signed cross-product of (line_end - line_start) × (point - line_start).
    Positive = one side, Negative = other side, Zero = on the line.
    """
    dx = line_end[0] - line_start[0]
    dy = line_end[1] - line_start[1]
    return dx * (point[1] - line_start[1]) - dy * (point[0] - line_start[0])


class LineCrossingCounter:
    """
    Maintains track side history with a hysteresis buffer to prevent double-counting.
    """

    def __init__(
        self,
        line_start: tuple[int, int],
        line_end:   tuple[int, int],
        buffer_pixels: float = 30.0,
    ) -> None:
        self.line_start = line_start
        self.line_end   = line_end
        self.in_count:  int = 0
        self.out_count: int = 0
        
        # Calculate line length to convert pixel buffer to cross-product space
        dx = line_end[0] - line_start[0]
        dy = line_end[1] - line_start[1]
        self.line_len = math.sqrt(dx * dx + dy * dy) or 1.0
        self.threshold = buffer_pixels * self.line_len

        # track_id → last confirmed side (-1 = left/top, 1 = right/bottom, 0 = buffer zone)
        self._track_sides: dict[int, int] = {}
        # track_id → last centroid
        self._prev_centroids: dict[int, tuple[float, float]] = {}

    @property
    def people_inside(self) -> int:
        """Running estimate of people currently inside."""
        return max(0, self.in_count - self.out_count)

    def update(self, track_id: int, bbox: tuple[float, float, float, float]) -> None:
        """
        Update the counter with a new bounding box for a tracked person.
        bbox format: (x1, y1, x2, y2)
        """
        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        centroid = (cx, cy)
        self._prev_centroids[track_id] = centroid

        val = _side_of_line(centroid, self.line_start, self.line_end)

        # Determine current side with hysteresis
        if val < -self.threshold:
            curr_side = -1
        elif val > self.threshold:
            curr_side = 1
        else:
            curr_side = 0   # Inside the buffer zone

        # If we have a previously confirmed side and a new confirmed side on the opposite side:
        prev_side = self._track_sides.get(track_id, 0)

        if prev_side != 0 and curr_side != 0 and prev_side != curr_side:
            # Crossing detected!
            if prev_side == -1 and curr_side == 1:
                self.in_count += 1
            elif prev_side == 1 and curr_side == -1:
                self.out_count += 1
            
            # Update the confirmed side to the new side
            self._track_sides[track_id] = curr_side
        elif prev_side == 0 and curr_side != 0:
            # First time establishing a confirmed side outside the buffer zone
            self._track_sides[track_id] = curr_side

    def release_track(self, track_id: int) -> None:
        """Call when a track disappears to free memory."""
        self._prev_centroids.pop(track_id, None)
        self._track_sides.pop(track_id, None)

    def reset(self) -> None:
        """Reset all counters."""
        self.in_count  = 0
        self.out_count = 0
        self._prev_centroids.clear()
        self._track_sides.clear()
