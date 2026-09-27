// ===== IMPORT FIREBASE =====
import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ===== ELEMENT =====
const form = document.getElementById("formharga");
const tabel = document.getElementById("tabeldata");


// ===== FUNGSI ID =====
function buatID() {
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}


// ===== FORMAT TANGGAL =====
function formatTanggal() {
  const tgl = new Date();

  const dd = String(tgl.getDate()).padStart(2, "0");
  const mm = String(tgl.getMonth() + 1).padStart(2, "0");
  const yy = String(tgl.getFullYear()).slice(-2);

  return `${dd}/${mm}/${yy}`;
}


// ===== FORMAT RUPIAH =====
function rupiah(angka) {
  return "Rp " + Number(angka).toLocaleString("id-ID");
}


// ===== HITUNG =====
function hitung(beli, jual) {
  const laba = jual - beli;

  const margin = jual > 0
    ? ((laba / jual) * 100).toFixed(1)
    : "0.0";

  const markup = beli > 0
    ? ((laba / beli) * 100).toFixed(1)
    : "0.0";

  return {
    laba,
    margin,
    markup
  };
}


// ===== AMBIL DATA =====
function ambilData() {
  return JSON.parse(localStorage.getItem("dataIkan")) || [];
}


// ===== SIMPAN DATA =====
function simpanLocal(data) {
  localStorage.setItem("dataIkan", JSON.stringify(data));
}


// ===== RENDER TABEL =====
function render() {
  const data = ambilData();

  tabel.innerHTML = "";

  data.forEach(item => {

    const { laba, margin, markup } =
      hitung(item.beli, item.jual);

    const row = `
      <tr>
        <td>${item.jenis}</td>

        <td>${rupiah(item.beli)}</td>

        <td>${rupiah(item.jual)}</td>

        <td>${rupiah(laba)}</td>

        <td>${margin}%</td>

        <td>${markup}%</td>

        <td>${item.tanggal}</td>

        <td>
          <button onclick="editHarga('${item.id}')">
            Edit
          </button>

          <button onclick="hapusHarga('${item.id}')">
            Hapus
          </button>
        </td>
      </tr>
    `;

    tabel.innerHTML += row;
  });
}


// ==================================================
// ===== SIMPAN / PERBARUI HARGA ====================
// ==================================================

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const jenisInput =
    document.getElementById("jenis").value.trim();

  const beli =
    Number(document.getElementById("hargabeli").value);

  const jual =
    Number(document.getElementById("hargajual").value);


  if (!jenisInput || beli <= 0 || jual <= 0) {
    alert("Data harga belum lengkap.");
    return;
  }


  let data = ambilData();


  // =================================================
  // CARI JENIS IKAN YANG SAMA
  // =================================================

  const index = data.findIndex(item =>
    item.jenis.toLowerCase() === jenisInput.toLowerCase()
  );


  // =================================================
  // KALAU SUDAH ADA → PERBARUI
  // =================================================

  if (index !== -1) {

    const itemLama = data[index];

    data[index] = {
      ...itemLama,

      jenis: jenisInput,
      beli,
      jual,

      // tanggal berubah menjadi tanggal update
      tanggal: formatTanggal(),

      // harus sync ulang ke Firebase
      status: "pending"
    };


    console.log("Harga diperbarui:");
    console.log("Data lama:", itemLama);
    console.log("Data baru:", data[index]);

  }


  // =================================================
  // KALAU BELUM ADA → BUAT DATA BARU
  // =================================================

  else {

    const dataBaru = {
      id: buatID(),
      jenis: jenisInput,
      beli,
      jual,
      tanggal: formatTanggal(),
      status: "pending"
    };

    data.push(dataBaru);

    console.log("Harga baru ditambahkan:", dataBaru);
  }


  // ===== SIMPAN LOCAL =====
  simpanLocal(data);

  render();

  form.reset();


  // ===== LANGSUNG COBA SYNC =====
  await syncData();
});


// ==================================================
// ===== EDIT HARGA ==================================
// ==================================================

window.editHarga = function(id) {

  const data = ambilData();

  const item = data.find(item => item.id === id);

  if (!item) {
    alert("Data tidak ditemukan.");
    return;
  }


  document.getElementById("jenis").value =
    item.jenis;

  document.getElementById("hargabeli").value =
    item.beli;

  document.getElementById("hargajual").value =
    item.jual;


  console.log("Edit harga:", item);


  // fokus ke input harga beli
  document.getElementById("hargabeli").focus();
};


// ==================================================
// ===== HAPUS HARGA =================================
// ==================================================

window.hapusHarga = async function(id) {

  const data = ambilData();

  const item = data.find(item => item.id === id);

  if (!item) {
    alert("Data tidak ditemukan.");
    return;
  }


  const yakin = confirm(
    `Hapus harga ${item.jenis}?\n\n` +
    `Harga beli: ${rupiah(item.beli)}\n` +
    `Harga jual: ${rupiah(item.jual)}`
  );


  if (!yakin) {
    return;
  }


  // =================================================
  // HAPUS DARI LOCAL STORAGE
  // =================================================

  const dataBaru =
    data.filter(item => item.id !== id);

  simpanLocal(dataBaru);

  render();


  // =================================================
  // HAPUS DARI FIREBASE
  // =================================================

  try {

    await deleteDoc(
      doc(db, "hargaIkan", id)
    );

    console.log(
      "Berhasil hapus dari Firebase:",
      id
    );

  } catch (err) {

    console.log(
      "Gagal hapus dari Firebase:",
      err
    );

    alert(
      "Data sudah dihapus dari HP, " +
      "tetapi gagal menghapus dari Firebase. " +
      "Cek koneksi internet."
    );
  }
};


// ==================================================
// ===== SYNC KE FIREBASE ============================
// ==================================================

async function syncData() {

  let data = ambilData();


  console.log(
    "Mulai sync data harga...",
    data
  );


  for (let item of data) {

    if (item.status === "pending") {

      try {

        console.log(
          "Sync:",
          item.jenis,
          item.beli,
          item.jual
        );


        await setDoc(
          doc(db, "hargaIkan", item.id),
          item
        );


        item.status = "done";


        console.log(
          "Berhasil sync:",
          item.jenis
        );

      } catch (err) {

        console.log(
          "Gagal sync:",
          item.jenis,
          err
        );
      }
    }
  }


  simpanLocal(data);

  render();
}


// ==================================================
// ===== DETEKSI ONLINE ==============================
// ==================================================

window.addEventListener(
  "online",
  () => {

    console.log(
      "Internet kembali online. Sync..."
    );

    syncData();
  }
);


// ==================================================
// ===== LOAD AWAL ===================================
// ==================================================

render();

syncData();