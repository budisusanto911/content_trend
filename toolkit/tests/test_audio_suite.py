"""
Unit Test: Audio Enhancer & Retention Suite
Memverifikasi pembuatan BGM prosedural, SFX, dan auto-ducking.
"""

import os
import subprocess
import unittest
from toolkit.audio_enhancer import (
    generate_procedural_bgm,
    generate_procedural_sfx,
    mix_smart_audio_with_ducking,
    apply_retention_zoom_punch
)

class TestAudioSuite(unittest.TestCase):
    def setUp(self):
        os.makedirs("test_tmp", exist_ok=True)
        # Buat video dummy sintetis 4 detik (1280x720) dengan suara beep 1 kHz
        self.dummy_video = "test_tmp/dummy_input.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "testsrc=duration=4:size=1280x720:rate=25",
            "-f", "lavfi", "-i", "sine=frequency=1000:duration=4",
            "-c:v", "libx264", "-c:a", "aac",
            self.dummy_video
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def tearDown(self):
        for f in ["test_tmp/dummy_input.mp4", "test_tmp/output_ducked.mp4", "test_tmp/output_zoom.mp4"]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

    def test_procedural_bgm_generation(self):
        bgm_path = "test_tmp/test_bgm.mp3"
        result = generate_procedural_bgm(output_path=bgm_path, duration=5)
        self.assertIsNotNone(result)
        self.assertTrue(os.path.exists(bgm_path))
        self.assertGreater(os.path.getsize(bgm_path), 500)
        os.remove(bgm_path)

    def test_procedural_sfx_generation(self):
        sfx_path = "test_tmp/test_sfx.wav"
        result = generate_procedural_sfx(output_path=sfx_path)
        self.assertIsNotNone(result)
        self.assertTrue(os.path.exists(sfx_path))
        self.assertGreater(os.path.getsize(sfx_path), 200)
        os.remove(sfx_path)

    def test_smart_audio_ducking(self):
        output_path = "test_tmp/output_ducked.mp4"
        res = mix_smart_audio_with_ducking(self.dummy_video, output_path)
        self.assertEqual(res, output_path)
        self.assertTrue(os.path.exists(output_path))
        self.assertGreater(os.path.getsize(output_path), 1000)

    def test_retention_zoom_punch(self):
        output_path = "test_tmp/output_zoom.mp4"
        res = apply_retention_zoom_punch(self.dummy_video, output_path, [(0.0, 1.5)])
        self.assertEqual(res, output_path)
        self.assertTrue(os.path.exists(output_path))
        self.assertGreater(os.path.getsize(output_path), 1000)

if __name__ == "__main__":
    unittest.main()

