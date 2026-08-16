export const SEMUA_FITUR = [
    { id:'sipena',      label:'📊 SIPENA (Penilaian)' },
    { id:'sican',       label:'📷 SICAN (Absensi QR)' },
    { id:'rekap_absen', label:'📋 Rekap Absensi' },
    { id:'supervisi',   label:'🔍 Supervisi' },
    { id:'pmbm',        label:'📝 PMBM (Pendaftaran)' },
    { id:'bank_soal',   label:'📚 Bank Soal' },
    { id:'berita',      label:'📰 Berita/Pengumuman' },
];

export function renderCheckboxFitur(containerId, selectedIds=[]){
    const wrap = document.getElementById(containerId);

    if(!wrap) return;

    wrap.innerHTML = SEMUA_FITUR.map(f=>`
        <div class="fitur-item">
            <input 
                type="checkbox"
                id="${containerId}_${f.id}"
                value="${f.id}"
                ${selectedIds.includes(f.id)?'checked':''}
            >

            <label for="${containerId}_${f.id}">
                ${f.label}
            </label>
        </div>
    `).join('');
}

export function getSelectedFitur(containerId){
    return SEMUA_FITUR
        .filter(f=>document.getElementById(`${containerId}_${f.id}`)?.checked)
        .map(f=>f.id);
}

export function labelFitur(ids=[]){

    if(!ids.length){
        return `
            <span style="color:#94a3b8;font-size:0.78rem;">
                -
            </span>
        `;
    }

    return ids.map(id=>{

        const f = SEMUA_FITUR.find(x=>x.id===id);

        return f
            ? `
                <span style="
                    background:#e0e7ff;
                    color:#3730a3;
                    padding:2px 7px;
                    border-radius:4px;
                    font-size:0.72rem;
                    font-weight:700;
                    margin:2px;
                    display:inline-block;
                ">
                    ${f.label}
                </span>
            `
            : '';

    }).join('');
}
