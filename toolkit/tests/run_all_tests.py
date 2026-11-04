"""
Master Test Runner untuk Antigravity Content Automation Suite
Menjalankan seluruh unit test suite untuk:
1. Smart Audio Suite (BGM, Ducking, SFX, Retention Zoom)
2. Smart Face & Speaker Tracker Reframe (16:9 -> 9:16)
3. Omnichannel Repurposer Engine (Threads, Community Post, Bilingual ASS)
4. Faceless AI Video Creator Engine (TTS, Visual, Dynamic Render)
5. Analytics Feedback Loop & Optimizer
"""

import sys
import unittest
import os
import shutil

# Tambahkan root workspace ke sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from toolkit.tests.test_audio_suite import TestAudioSuite
from toolkit.tests.test_face_tracker import TestFaceTracker
from toolkit.tests.test_repurposer import TestRepurposer
from toolkit.tests.test_faceless_engine import TestFacelessEngine
from toolkit.tests.test_analytics_tracker import TestAnalyticsTracker

def run_suite():
    print("=" * 65)
    print("🚀 MENJALANKAN MASTER TEST SUITE: AUTOMATION ENGINE SUITE")
    print("=" * 65)

    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestAudioSuite))
    suite.addTest(unittest.makeSuite(TestFaceTracker))
    suite.addTest(unittest.makeSuite(TestRepurposer))
    suite.addTest(unittest.makeSuite(TestFacelessEngine))
    suite.addTest(unittest.makeSuite(TestAnalyticsTracker))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Cleanup temp test folder jika ada
    if os.path.exists("test_tmp"):
        try:
            shutil.rmtree("test_tmp")
        except Exception:
            pass

    print("\n" + "=" * 65)
    if result.wasSuccessful():
        print(f"✅ SEMUA PENGUJIAN BERHASIL ({result.testsRun} tests passed)!")
        print("Sistem siap digunakan langsung secara penuh!")
        print("=" * 65)
        return 0
    else:
        print(f"❌ TERJADI KEGAGALAN: {len(result.failures)} gagal, {len(result.errors)} error.")
        print("=" * 65)
        return 1

if __name__ == "__main__":
    sys.exit(run_suite())

