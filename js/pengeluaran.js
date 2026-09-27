import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =====================
// STORAGE
// =====================
const getData = () =>
  JSON.parse(localStorage.getItem("pengeluaran")) || [];

const saveData = (data) =>
  localStorage.setItem("pengeluaran", JSON.stringify(data));

// =====================
// UTIL
// =====================
const rupiah = (n) =>
  "Rp " + Number(n || 0).toLocaleString("id-ID");

const generateId = () =>
  crypto.randomUUID();

const tanggalHariIni = () => {
  const d = new Date();

  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

// =====================
// RENDER TABEL
// =====================
function render() {
  const tbody = document.getElementById("riwayatpengeluaran");

  if (!tbody) return;

  tbody.innerHTML = "";

  // Tampilkan hanya 10 data terbaru
  const data = [...getData()]
    .reverse()
    .slice(0, 10);

  data.forEach((item) => {
    tbody.innerHTML += `
      <tr>
        <td>${item.tanggal}</td>
        <td>${item.nama}</td>
        <td>${rupiah(item.uang)}</td>
        <td>
          <button onclick="hapus('${item.id}')">
            ❌
          </button>
        </td>
      </tr>
    `;
  });
}

// =====================
// RINGKASAN
// =====================
function updateRingkasan() {
  const data = getData();

  const sekarang = new Date();
  const bulanIni = sekarang.getMonth() + 1;
  const tahunIni = sekarang.getFullYear();

  let total = 0;
  let hariIni = 0;
  let bulan = 0;
  let tahun = 0;

  const hariUnik = new Set();
  const bulanUnik = new Set();
  const tahunUnik = new Set();

  data.forEach((item) => {
    const uang = Number(item.uang || 0);

    total += uang;

    const [tgl, bln, thn] =
      item.tanggal.split("/");

    hariUnik.add(`${tgl}/${bln}/${thn}`);
    bulanUnik.add(`${bln}/${thn}`);
    tahunUnik.add(thn);

    if (item.tanggal === tanggalHariIni()) {
      hariIni += uang;
    }

    if (
      Number(bln) === bulanIni &&
      Number(thn) === tahunIni
    ) {
      bulan += uang;
    }

    if (
      Number(thn) === tahunIni
    ) {
      tahun += uang;
    }
  });

  const rataHari =
    total / (hariUnik.size || 1);

  const rataBulan =
    total / (bulanUnik.size || 1);

  const rataTahun =
    total / (tahunUnik.size || 1);

  document.getElementById(
    "pengeluaranhariini"
  ).textContent = rupiah(hariIni);

  document.getElementById(
    "pengeluaranbulanini"
  ).textContent = rupiah(bulan);

  document.getElementById(
    "pengeluarantahunini"
  ).textContent = rupiah(tahun);

  document.getElementById(
    "totalpengeluaran"
  ).textContent = rupiah(total);

  document.getElementById(
    "rata-ratapengeluaranharian"
  ).textContent = rupiah(rataHari);

  document.getElementById(
    "rata-ratapengeluaranbulanan"
  ).textContent = rupiah(rataBulan);

  document.getElementById(
    "rata-ratapengeluarantahunan"
  ).textContent = rupiah(rataTahun);
}

// =====================
// HAPUS
// =====================
window.hapus = async (idHapus) => {
  if (!confirm("Hapus data?")) return;

  try {
    await deleteDoc(
      doc(db, "pengeluaran", idHapus)
    );
  } catch (err) {
    console.log(err);
  }

  const data = getData().filter(
    (item) => item.id !== idHapus
  );

  saveData(data);

  render();
  updateRingkasan();

  window.dispatchEvent(
    new Event("pengeluaranUpdate")
  );
};

// =====================
// SYNC FIRESTORE
// =====================
let syncing = false;

async function sync() {
  if (syncing) return;

  syncing = true;

  try {
    const data = getData();

    let changed = false;

    for (let i = 0; i < data.length; i++) {
      if (data[i].status === "done")
        continue;

      try {
        await setDoc(
          doc(
            db,
            "pengeluaran",
            data[i].id
          ),
          data[i]
        );

        data[i].status = "done";
        changed = true;
      } catch (err) {
        console.log(err);
      }
    }

    if (changed) {
      saveData(data);
    }
  } finally {
    syncing = false;
  }
}

// =====================
// FORM
// =====================
document
  .getElementById("formpengeluaran")
  .addEventListener("submit", (e) => {
    e.preventDefault();

    const nama =
      e.target.pengeluaran.value.trim();

    const uang = Number(
      e.target.uang.value
    );

    if (!nama || uang <= 0) {
      alert("Input tidak valid!");
      return;
    }

    const data = getData();

    data.push({
      id: generateId(),
      nama,
      uang,
      tanggal: tanggalHariIni(),
      status: "pending"
    });

    saveData(data);

    e.target.reset();

    render();
    updateRingkasan();

    window.dispatchEvent(
      new Event("pengeluaranUpdate")
    );

    sync();
  });

// =====================
// EVENT
// =====================
window.addEventListener(
  "online",
  sync
);

window.addEventListener(
  "storage",
  () => {
    render();
    updateRingkasan();
  }
);

// =====================
// INIT
// =====================
render();
updateRingkasan();
sync();