"""
Omnichannel Repurposer Engine
Mengubah 1 klip video & transkrip menjadi multi-format:
1. Viral 4-part Thread untuk Threads & Twitter/X.
2. YouTube Community Tab Discussion & Interactive Poll.
3. Dual-Language Subtitles (.ass dengan subtitle utama ID dan subtitle pendamping EN).
"""

import os
import json
import re

def generate_viral_thread(title, hook, transcript=""):
    """
    Menghasilkan 4 slide/bagian thread viral untuk platform teks (Threads / X).
    """
    clean_title = title.strip()
    clean_hook = hook.strip()

    # Part 1: Hook Opening
    part1 = f"🔥 {clean_hook}\n\nBanyak orang belum menyadari hal penting ini. Ini rangkuman singkat dari pembahasan terbarunya 👇 [Thread 1/4]"

    # Part 2: Core Insight
    summary_text = transcript[:220].strip() if transcript else clean_title
    part2 = f"💡 Poin Inti:\n\n{summary_text}...\n\nSeringkali kita hanya melihat permukaannya saja, padahal dampaknya jauh lebih besar. [2/4]"

    # Part 3: Actionable Lesson / Takeaway
    part3 = "🎯 Apa yang bisa kita pelajari?\n\n1. Selalu cermati sebelum mengambil keputusan.\n2. Pola ini terbukti berulang berkali-kali.\n3. Jangan mudah terdistraksi hal viral yang semu. [3/4]"

    # Part 4: Engagement CTA
    part4 = f"👇 Menurut Anda bagaimana soal {clean_title[:35]} ini? Tulis pendapat Anda di kolom komentar!\n\nFollow akun ini untuk update tren & insight viral setiap hari. 🚀 [4/4]"

    return {
        "threads": [part1, part2, part3, part4],
        "full_text": "\n\n---\n\n".join([part1, part2, part3, part4])
    }

def generate_youtube_community_post(title, hook):
    """
    Membuat postingan tab Komunitas YouTube + opsi polling interaktif.
    """
    question = f"Momen panas: {hook}! Menurut kamu siapa yang paling benar dalam situasi ini?"
    options = [
        "Sangat setuju dengan pandangan di video",
        "Kurang setuju, ada sudut pandang lain",
        "Masih netral, butuh bukti lebih banyak",
        "Cuma ingin lihat hasil polling 👀"
    ]
    post_text = (
        f"📢 Pembahasan Hangat Hari Ini: {title}\n\n"
        f"🔥 {hook}\n\n"
        f"Bagikan pendapat kamu di bawah lewat vote polling ini!"
    )
    return {
        "post_text": post_text,
        "poll_question": question,
        "poll_options": options
    }

def generate_dual_language_ass(source_ass_file, output_ass_file, translate_map=None):
    """
    Membaca file subtitle ASS bahasa Indonesia dan menyisipkan terjemahan bahasa Inggris
    di bawahnya secara dwibahasa (Bilingual Subtitles) dengan ukuran font lebih kecil.
    """
    if not os.path.exists(source_ass_file):
        return None

    with open(source_ass_file, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.splitlines()
    new_lines = []

    # Simple dictionary fallback untuk terjemahan umum jika tanpa network/AI
    default_dict = {
        "tidak": "not",
        "dan": "and",
        "yang": "that",
        "ini": "this",
        "untuk": "for",
        "bisa": "can",
        "jangan": "don't",
        "gagal": "failed",
        "momen": "moment",
        "viral": "viral"
    }
    if translate_map:
        default_dict.update(translate_map)

    for line in lines:
        if line.startswith("Dialogue:"):
            parts = line.split(",", 9)
            if len(parts) == 10:
                text_id = parts[9]
                # Bersihkan tag format jika ada
                clean_text = re.sub(r"\{.*?\}", "", text_id).strip()
                # Dummy bilingual helper
                words = clean_text.split()
                translated_words = [default_dict.get(w.lower(), w) for w in words]
                trans_en = " ".join(translated_words)

                # Format dua baris: Baris 1 teks ID besar, Baris 2 teks EN kecil warna abu-abu muda
                bilingual_text = f"{text_id}\\N{{\\fs26\\c&HCCCCCC&}}({trans_en})"
                parts[9] = bilingual_text
                new_lines.append(",".join(parts))
                continue
        new_lines.append(line)

    with open(output_ass_file, "w", encoding="utf-8") as f:
        f.write("\n".join(new_lines))

    return output_ass_file

