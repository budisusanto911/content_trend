export function generateAiPrompt(context: any): string {
  const storyStructure = context.contentBrief?.storyStructure?.join(" -> ") || "N/A";
  
  return `Saya ingin membuat video yang lengkap dan mendetail. Tolong buatkan videonya secara langsung berdasarkan spesifikasi visual dan naskah berikut ini, tanpa perlu bertanya lagi.

TOPIK VIDEO:
${context.trend.topic} (Angle: ${context.contentOpportunity.uniqueAngle})

DETAIL ADEGAN & OBJEK (VISUAL):
- Adegan: Sinematik, berpusat pada subjek yang relevan dengan topik, dengan pergantian adegan yang cepat (fast-paced) setiap 3 detik untuk mempertahankan retensi.
- Objek: Menampilkan elemen modern, teknologi, atau gaya hidup yang sesuai dengan audiens (${context.audience.primaryAudience}). Tampilkan teks grafis (caption) bergaya bold di tengah layar untuk menekankan poin-poin penting.
- Suasana (Atmosphere): Energetik, profesional, namun tetap engaging dan kekinian (cocok untuk audiens media sosial).
- Gaya Visual: Resolusi tinggi (4K), pencahayaan studio yang dramatis namun terang, warna-warna kontras tinggi (vibrant), gaya editing mirip konten kreator top YouTube/TikTok.

STRUKTUR CERITA:
${storyStructure}

NASKAH SUARA (VOICE OVER) YANG HARUS DIBACAKAN:
"${context.contentBrief?.hook || "Mari kita bahas ini."} [Lanjutkan dengan penjelasan mendalam mengenai problem, eksperimen, dan hasil akhir berdasarkan topik di atas, diakhiri dengan Call to Action yang kuat. Naskah harus mengalir tanpa label teks seperti kurung siku.]"

Tolong generate videonya sekarang juga dengan gaya visual dan naskah di atas.`;
}
