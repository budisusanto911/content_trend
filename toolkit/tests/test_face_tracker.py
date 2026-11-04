"""
Unit Test: Smart Face & Speaker Tracking Reframe Module
Memverifikasi kalkulasi dimensi, deteksi pergerakan, dan reframe 9:16.
"""

import os
import subprocess
import unittest
from toolkit.face_tracker import (
    get_video_dimensions,
    analyze_motion_centroid_trajectory,
    generate_reframe_filter,
    reframe_video_to_vertical
)

class TestFaceTracker(unittest.TestCase):
    def setUp(self):
        os.makedirs("test_tmp", exist_ok=True)
        self.dummy_video = "test_tmp/dummy_landscape.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "testsrc=duration=3:size=1280x720:rate=25",
            "-c:v", "libx264",
            self.dummy_video
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def tearDown(self):
        for f in [self.dummy_video, "test_tmp/dummy_vertical.mp4"]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

    def test_dimensions(self):
        w, h = get_video_dimensions(self.dummy_video)
        self.assertEqual(w, 1280)
        self.assertEqual(h, 720)

    def test_trajectory_analysis(self):
        traj = analyze_motion_centroid_trajectory(self.dummy_video, duration=3)
        self.assertIsInstance(traj, list)
        self.assertGreaterEqual(len(traj), 2)

    def test_reframe_filter_generation(self):
        filter_str = generate_reframe_filter(self.dummy_video, duration=3)
        self.assertIn("crop=", filter_str)
        self.assertIn("scale=1080:1920", filter_str)

    def test_reframe_video_to_vertical(self):
        out_vertical = "test_tmp/dummy_vertical.mp4"
        res = reframe_video_to_vertical(self.dummy_video, out_vertical, duration=3)
        self.assertEqual(res, out_vertical)
        self.assertTrue(os.path.exists(out_vertical))
        w, h = get_video_dimensions(out_vertical)
        self.assertEqual(w, 1080)
        self.assertEqual(h, 1920)

if __name__ == "__main__":
    unittest.main()
