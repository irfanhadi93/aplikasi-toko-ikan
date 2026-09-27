import { db, currentUser, onUserReady, ref, get, set } from './firebase.js';
import { getDataAset } from './aset.js';

// ======= LocalStorage Key =======
const KEY_BEREDAR = "lbikBeredar";

// ======= Ambil lembar beredar (Hybrid) =======
export async function getLembarBeredar() {
    let beredar = Number(localStorage.getItem(KEY_BEREDAR)) || 0;

    try {
        await onUserReady();
        const snap = await get(ref(db, `lbik/${currentUser.uid}/beredar`));
        if (snap.exists()) {
            beredar = snap.val();
            localStorage.setItem(KEY_BEREDAR, beredar);
        }
    } catch {}

    return beredar;
}

// ======= Simpan lembar beredar (Hybrid Sync) =======
async function simpanLembarBeredar(beredar) {
    localStorage.setItem(KEY_BEREDAR, beredar);
    try {
        await onUserReady();
        await set(ref(db, `lbik/${currentUser.uid}/beredar`), beredar);
    } catch {}
}

// ======= Ambil total LBIK (total aset) =======
export async function getTotalLBIK() {
    try {
        const data = await getDataAset();
        return data.totalAset;
    } catch {
        return Number(localStorage.getItem(KEY_BEREDAR)) || 0;
    }
}

// ======= Versi sinkron untuk logika lokal =======
export function getTotalLBIKSync() {
    return Number(localStorage.getItem(KEY_BEREDAR)) || 0;
}

// ======= Tambah lembar (Hybrid) =======
export async function tambahLembar(jumlah) {
    const totalLBIK = await getTotalLBIK();
    let beredar = await getLembarBeredar();

    if (beredar + jumlah > totalLBIK) return false;

    beredar += jumlah;
    await simpanLembarBeredar(beredar);
    return true;
}

// ======= Kurangi lembar (Hybrid) =======
export async function kurangiLembar(jumlah) {
    let beredar = await getLembarBeredar();
    if (jumlah > beredar) return false;

    beredar -= jumlah;
    await simpanLembarBeredar(beredar);
    return true;
}

// ======= Render total dan beredar ke halaman HTML =======
export async function renderTotalLBIK(targetTotalEl, targetBeredarEl) {
    const total = await getTotalLBIK();
    const beredar = await getLembarBeredar();

    if (targetTotalEl) targetTotalEl.textContent = total.toLocaleString();
    if (targetBeredarEl) targetBeredarEl.textContent = beredar.toLocaleString();
}

// ======= Auto render saat DOM siap =======
document.addEventListener('DOMContentLoaded', async () => {
    const totalLBIKEl = document.getElementById('totalLBIK');
    const beredarEl = document.getElementById('lbikBeredar');
    await renderTotalLBIK(totalLBIKEl, beredarEl);
});