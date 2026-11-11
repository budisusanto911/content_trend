import subprocess
import os

def cut_video(url, start_time, end_time, output_filename="output.mp4"):
    """
    Downloads and cuts a specific segment of a YouTube video using yt-dlp and ffmpeg.
    start_time and end_time format: "HH:MM:SS" (e.g., "00:01:30")
    """
    print(f"🔄 Mengunduh dan memotong video dari {start_time} sampai {end_time}...")
    
    # yt-dlp command to download only a specific section
    command = [
        "yt-dlp",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--download-sections", f"*{start_time}-{end_time}",
        "--force-keyframes-at-cuts",
        "-o", output_filename,
        url
    ]
    
    try:
        subprocess.run(command, check=True)
        print(f"✅ Berhasil! Video disimpan sebagai {output_filename}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Gagal memotong video. Pastikan yt-dlp dan ffmpeg terinstall dengan benar.")
        print(e)
    except FileNotFoundError:
        print(f"❌ Error: 'yt-dlp' tidak ditemukan. Pastikan sudah diinstall.")

if __name__ == "__main__":
    print("=== AI Clipper: Fase 1 (Mesin Dasar) ===")
    video_url = input("Masukkan URL YouTube: ")
    start = input("Mulai (format JJ:MM:DD, contoh 00:01:00): ")
    end = input("Selesai (format JJ:MM:DD, contoh 00:01:30): ")
    
    output_name = "klip_pertama.mp4"
    if os.path.exists(output_name):
        os.remove(output_name) # Hapus file lama jika ada
        
    cut_video(video_url, start, end, output_name)

