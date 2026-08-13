// ══════════════════════════════════════════════
// E-LEARNING AI MODULE (Support PG, Essay & LOTS/MOTS/HOTS)
// ══════════════════════════════════════════════

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODELS = [
    'openrouter/free',                          // auto-pilih model gratis (paling andal)
    'meta-llama/llama-4-scout:free',           // fallback 1
    'meta-llama/llama-3.3-70b-instruct:free',  // fallback 2
    'qwen/qwen-2.5-7b-instruct:free'           // fallback 3
];

async function getCentralizedApiKey() {
    try {
        if (typeof db === 'undefined') throw new Error('Database belum terinisialisasi');
        const doc = await db.collection('settings').doc('ai_config').get();
        if (!doc.exists || !doc.data().openrouter_api_key) {
            throw new Error('API Key belum dikonfigurasi oleh Administrator.');
        }
        return doc.data().openrouter_api_key.trim();
    } catch (error) {
        console.error('Gagal mengambil API Key:', error);
        throw new Error('Fitur AI sedang tidak tersedia. Silakan hubungi Administrator.');
    }
}

async function callAIWithRetry(prompt, maxRetries = 2) {
    const apiKey = await getCentralizedApiKey();
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        for (const model of MODELS) {
            try {
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'SIPELITA E-Learning'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                        max_tokens: 4000
                    })
                });
                if (response.status === 429) { await new Promise(r => setTimeout(r, 5000)); continue; }
                if (!response.ok) { const err = await response.json(); console.warn(err.error?.message); continue; }
                
                const data = await response.json();
                let text = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const soalList = JSON.parse(text);
                if (Array.isArray(soalList) && soalList.length > 0) return soalList;
            } catch (error) { continue; }
        }
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error('Semua model gagal. Coba lagi nanti.');
}

// Fungsi generate soal (Mendukung PG dan Essay)
window.generateSoalHybrid = async function(materiData) {
    let youtubeInfo = '';
    if (materiData.youtube) {
        try {
            const videoId = materiData.youtube.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1];
            if (videoId) {
                const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                if (res.ok) {
                    const data = await res.json();
                    youtubeInfo = `\n\n🎬 VIDEO YOUTUBE:\nJudul: ${data.title}\nPenulis: ${data.author_name}`;
                }
            }
        } catch (e) { console.warn('Gagal ambil metadata YouTube:', e); }
    }
    
    let prompt = `Anda adalah guru ahli dan penyusun soal profesional. 
Buatkan ${materiData.jumlahPG || 0} soal Pilihan Ganda (A-E) dan ${materiData.jumlahEssay || 0} soal Essay berdasarkan materi berikut.

📚 MATERI:
${materiData.teks || 'Tidak ada teks'}
${youtubeInfo}
${materiData.images?.length > 0 ? '\n🖼️ Ada gambar yang dilampirkan.' : ''}

ATURAN PENTING:
1. Setiap soal WAJIB memiliki properti "type" bernilai "pilihan_ganda" atau "essay".
2. Setiap soal WAJIB memiliki properti "level" bernilai "LOTS" (Mengingat/Memahami), "MOTS" (Menerapkan/Menganalisis), atau "HOTS" (Mengevaluasi/Mencipta).
3. Untuk "pilihan_ganda", sertakan "opsi" (a,b,c,d,e) dan "jawabanBenar" (a/b/c/d/e).
4. Untuk "essay", sertakan "kunciJawaban" (poin-poin jawaban yang diharapkan).
5. HANYA output JSON ARRAY, tanpa teks pembuka/penutup.

FORMAT OUTPUT (WAJIB JSON ARRAY):
[
  {
    "type": "pilihan_ganda",
    "level": "HOTS",
    "pertanyaan": "Teks pertanyaan...",
    "opsi": {"a": "Opsi A", "b": "Opsi B", "c": "Opsi C", "d": "Opsi D", "e": "Opsi E"},
    "jawabanBenar": "a"
  },
  {
    "type": "essay",
    "level": "MOTS",
    "pertanyaan": "Teks pertanyaan essay...",
    "kunciJawaban": "Poin 1: ...\nPoin 2: ..."
  }
]`;

    try {
        const soalList = await callAIWithRetry(prompt);
        return soalList.map(soal => ({
            type: soal.type || 'pilihan_ganda',
            level: soal.level || 'MOTS',
            pertanyaan: soal.pertanyaan || 'Pertanyaan tidak tersedia',
            opsi: soal.type === 'pilihan_ganda' ? {
                a: soal.opsi?.a || 'Opsi A', b: soal.opsi?.b || 'Opsi B',
                c: soal.opsi?.c || 'Opsi C', d: soal.opsi?.d || 'Opsi D', e: soal.opsi?.e || 'Opsi E'
            } : {},
            jawabanBenar: (soal.jawabanBenar || 'a').toLowerCase(),
            kunciJawaban: soal.kunciJawaban || ''
        }));
    } catch (error) {
        console.error('AI Error:', error);
        throw new Error('Gagal generate soal: ' + error.message);
    }
};
