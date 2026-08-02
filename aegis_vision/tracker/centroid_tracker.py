"""
Simple Euclidean Centroid Tracker for OpenCV.
Assigns consistent IDs to moving objects by matching centroids across frames.
"""
from __future__ import annotations
import math
from collections import OrderedDict

class CentroidTracker:
    def __init__(self, max_disappeared: int = 50, max_distance: int = 50):
        # track_id -> [cx, cy]
        self.objects = OrderedDict()
        # track_id -> frames missing
        self.disappeared = OrderedDict()
        
        self._next_object_id = 0
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, centroid: tuple[int, int]) -> None:
        self.objects[self._next_object_id] = centroid
        self.disappeared[self._next_object_id] = 0
        self._next_object_id += 1

    def deregister(self, object_id: int) -> None:
        del self.objects[object_id]
        del self.disappeared[object_id]

    def update(self, rects: list[tuple[int, int, int, int]]) -> dict[int, tuple[int, int]]:
        """
        rects: list of bounding boxes (x, y, w, h)
        Returns dictionary mapping object_id -> (cx, cy)
        """
        if len(rects) == 0:
            # If no objects detected, mark all existing objects as disappeared
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            return self.objects

        # Calculate centroids for incoming rects
        input_centroids = []
        for (x, y, w, h) in rects:
            cx = int(x + w / 2.0)
            cy = int(y + h / 2.0)
            input_centroids.append((cx, cy))

        # If no objects are currently tracked, register all incoming ones
        if len(self.objects) == 0:
            for i in range(len(input_centroids)):
                self.register(input_centroids[i])
        else:
            object_ids = list(self.objects.keys())
            object_centroids = list(self.objects.values())

            # Calculate distance matrix
            D = []
            for oc in object_centroids:
                row = []
                for ic in input_centroids:
                    dist = math.hypot(oc[0] - ic[0], oc[1] - ic[1])
                    row.append(dist)
                D.append(row)

            # Assign based on minimum distance
            used_rows = set()
            used_cols = set()

            # Iterate through minimum distances
            # (Sort rows based on minimum distance)
            sorted_indices = sorted(
                [(r, c, D[r][c]) for r in range(len(D)) for c in range(len(D[r]))],
                key=lambda x: x[2]
            )

            for (row, col, val) in sorted_indices:
                if row in used_rows or col in used_cols:
                    continue
                if val > self.max_distance:
                    continue

                object_id = object_ids[row]
                self.objects[object_id] = input_centroids[col]
                self.disappeared[object_id] = 0

                used_rows.add(row)
                used_cols.add(col)

            # Handle unassigned existing objects
            unused_rows = set(range(len(object_centroids))) - used_rows
            for row in unused_rows:
                object_id = object_ids[row]
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)

            # Handle unassigned new centroids
            unused_cols = set(range(len(input_centroids))) - used_cols
            for col in unused_cols:
                self.register(input_centroids[col])

        return self.objects
