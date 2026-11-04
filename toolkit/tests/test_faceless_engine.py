"""
Unit Test: Faceless AI Video Creator Engine
Memverifikasi pembuatan naskah, voiceover natural, visual latar 9:16, dan rendering video utuh.
"""

import os
import unittest
from toolkit.faceless_engine import (
    generate_faceless_script,
    generate_voiceover,
    generate_dynamic_visual_background,
    generate_faceless_video
)
from toolkit.face_tracker import get_video_dimensions

class TestFacelessEngine(unittest.TestCase):
    def setUp(self):
        os.makedirs("test_tmp", exist_ok=True)

    def tearDown(self):
        for f in ["test_tmp/test_voice.mp3", "test_tmp/test_bg.mp4"]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

    def test_script_generation(self):
        script = generate_faceless_script("Perkembangan AI Indonesia")
        self.assertIn("hook", script)
        self.assertIn("body", script)
        self.assertIn("cta", script)
        self.assertIn("Perkembangan AI Indonesia", script["hook"])

    def test_voiceover_generation(self):
        out_voice = "test_tmp/test_voice.mp3"
        res = generate_voiceover("Halo dunia, ini adalah tes narasi otomatis.", out_voice)
        self.assertEqual(res, out_voice)
        self.assertTrue(os.path.exists(out_voice))
        self.assertGreater(os.path.getsize(out_voice), 500)

    def test_visual_background_generation(self):
        out_bg = "test_tmp/test_bg.mp4"
        res = generate_dynamic_visual_background(2.0, out_bg)
        self.assertEqual(res, out_bg)
        self.assertTrue(os.path.exists(out_bg))
        w, h = get_video_dimensions(out_bg)
        self.assertEqual(w, 1080)
        self.assertEqual(h, 1920)

    def test_end_to_end_faceless_video(self):
        res = generate_faceless_video("Tren Teknologi Masa Depan", output_dir="test_tmp")
        self.assertIn("filePath", res)
        self.assertTrue(os.path.exists(res["filePath"]))
        w, h = get_video_dimensions(res["filePath"])
        self.assertEqual(w, 1080)
        self.assertEqual(h, 1920)
        # Cleanup hasil akhir tes
        if os.path.exists(res["filePath"]):
            os.remove(res["filePath"])

if __name__ == "__main__":
    unittest.main()
