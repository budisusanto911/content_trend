"""
Unit Test: Omnichannel Repurposer Engine
Memverifikasi pembuatan thread 4-part, YouTube Community Post, dan bilingual subtitle (.ass).
"""

import os
import unittest
from toolkit.repurposer import (
    generate_viral_thread,
    generate_youtube_community_post,
    generate_dual_language_ass
)

class TestRepurposer(unittest.TestCase):
    def setUp(self):
        os.makedirs("test_tmp", exist_ok=True)
        self.sample_ass = "test_tmp/sample.ass"
        with open(self.sample_ass, "w", encoding="utf-8") as f:
            f.write(
                "[Script Info]\nTitle: Test\nScriptType: v4.00+\n\n"
                "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
                "Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,Jangan sampai gagal dalam membuat konten viral\n"
            )

    def tearDown(self):
        for f in [self.sample_ass, "test_tmp/sample_bilingual.ass"]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

    def test_viral_thread_generation(self):
        res = generate_viral_thread(
            "Strategi Konten AI 2026",
            "DITANTANG BEGINI, REAKSI BIKIN KAGET!",
            "Ini adalah transkrip mengenai pentingnya konsistensi dalam membuat konten video pendek."
        )
        self.assertIn("threads", res)
        self.assertEqual(len(res["threads"]), 4)
        self.assertIn("1/4", res["threads"][0])
        self.assertIn("4/4", res["threads"][3])

    def test_youtube_community_post(self):
        res = generate_youtube_community_post(
            "Debat Panas AI vs Manusia",
            "SIAPA YANG PALING UNGGUL?"
        )
        self.assertIn("post_text", res)
        self.assertIn("poll_question", res)
        self.assertGreaterEqual(len(res["poll_options"]), 3)

    def test_bilingual_ass_generation(self):
        out_ass = "test_tmp/sample_bilingual.ass"
        res = generate_dual_language_ass(self.sample_ass, out_ass)
        self.assertEqual(res, out_ass)
        self.assertTrue(os.path.exists(out_ass))
        with open(out_ass, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("\\N{\\fs26\\c&HCCCCCC&}", content)

if __name__ == "__main__":
    unittest.main()
