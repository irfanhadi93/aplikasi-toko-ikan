import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ======================================================
// STORAGE
// ======================================================

function ambilHarga() {
  try {
    return JSON.parse(localStorage.getItem("dataIkan")) || [];
  } catch {
    return [];
  }
}


function ambilPembelian() {
  try {
    return JSON.parse(localStorage.getItem("pembelianIkan")) || [];
  } catch {
    return [];
  }
}


function ambilPenjualan() {
  try {
    return JSON.parse(localStorage.getItem("penjualanIkan")) || [];
  } catch {
    return [];
  }
}


function simpanPembelian(data) {

  localStorage.setItem(
    "pembelianIkan",
    JSON.stringify(data)
  );

}


// ======================================================
// PENDING DELETE
// ======================================================

function ambilPendingDelete() {

  try {

    return JSON.parse(
      localStorage.getItem("pendingDeletePembelian")
    ) || [];

  } catch {

    return [];

  }

}


function simpanPendingDelete(data) {

  localStorage.setItem(
    "pendingDeletePembelian",
    JSON.stringify(data)
  );

}


function tambahPendingDelete(id) {

  let data = ambilPendingDelete();

  if (!data.includes(id)) {

    data.push(id);

    simpanPendingDelete(data);

  }

}


function hapusPendingDelete(id) {

  let data =
    ambilPendingDelete()
      .filter(x => x !== id);

  simpanPendingDelete(data);

}


// ======================================================
// FORMAT
// ======================================================

function rupiah(nilai) {

  return "Rp " +
    Number(nilai || 0)
      .toLocaleString("id-ID");

}


// ======================================================
// TANGGAL
// ======================================================

function tanggal() {

  let t = new Date();

  return (
    String(t.getDate()).padStart(2, "0")
    + "/" +
    String(t.getMonth() + 1).padStart(2, "0")
    + "/" +
    String(t.getFullYear()).slice(-2)
  );

}


// ======================================================
// ID
// ======================================================

function buatID() {

  if (
    crypto &&
    typeof crypto.randomUUID === "function"
  ) {

    return crypto.randomUUID();

  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );

}


// ======================================================
// DROPDOWN IKAN
// ======================================================

function isiIkan() {

  let select =
    document.getElementById("pilihikan");

  if (!select) return;


  let data = ambilHarga();


  let jenis =
    [
      ...new Set(
        data
          .map(x => x.jenis)
          .filter(Boolean)
      )
    ];


  select.innerHTML =
    '<option value="">-- pilih ikan --</option>';


  jenis.forEach(x => {

    let o =
      document.createElement("option");

    o.value = x;
    o.textContent = x;

    select.appendChild(o);

  });

}


// ======================================================
// HARGA TERAKHIR
// ======================================================

function hargaTerakhir(jenis) {

  let data =
    ambilHarga()
      .filter(x => x.jenis === jenis);


  return data.length
    ? data[data.length - 1]
    : null;

}


// ======================================================
// HITUNG STOK
// ======================================================

function hitungStok() {

  let hasil = {};


  // --------------------------------------------------
  // PEMBELIAN = STOK MASUK
  // --------------------------------------------------

  ambilPembelian()
    .forEach(item => {

      let jenis = item.jenis;

      if (!jenis) return;


      if (!hasil[jenis]) {

        hasil[jenis] = {

          stok: 0,

          totalModal: 0,

          totalBeratBeli: 0,

          beli: 0,

          jual: 0

        };

      }


      let berat =
        Number(item.berat) || 0;


      let uang =
        Number(item.uang) || 0;


      hasil[jenis].stok += berat;

      hasil[jenis].totalBeratBeli += berat;

      hasil[jenis].totalModal += uang;

    });


  // --------------------------------------------------
  // HARGA MODAL RATA-RATA
  // --------------------------------------------------

  for (let jenis in hasil) {

    let i = hasil[jenis];


    if (i.totalBeratBeli > 0) {

      i.beli =
        i.totalModal /
        i.totalBeratBeli;

    }


    let harga =
      hargaTerakhir(jenis);


    if (harga) {

      i.jual =
        Number(harga.jual) || 0;

    }

  }


  // --------------------------------------------------
  // PENJUALAN = STOK KELUAR
  // --------------------------------------------------

  ambilPenjualan()
    .forEach(item => {

      let jenis = item.jenis;

      if (!hasil[jenis]) return;


      let berat =
        Number(item.berat) || 0;


      hasil[jenis].stok -= berat;

    });


  // --------------------------------------------------
  // CEGAH ANGKA -0
  // --------------------------------------------------

  for (let jenis in hasil) {

    if (
      hasil[jenis].stok > -0.0001 &&
      hasil[jenis].stok < 0.0001
    ) {

      hasil[jenis].stok = 0;

    }

  }


  return hasil;

}


// ======================================================
// TAMPIL STOK
// ======================================================

function tampilStok() {

  let tabel =
    document.getElementById("tabelstok");

  if (!tabel) return;


  tabel.innerHTML = "";


  let data = hitungStok();


  for (let jenis in data) {

    let i = data[jenis];


    let stok =
      Math.max(0, i.stok);


    let nilaiStok =
      stok * i.beli;


    let potensi =
      stok * i.jual;


    let laba =
      potensi - nilaiStok;


    tabel.innerHTML +=
      `
      <tr>

        <td>${jenis}</td>

        <td>${stok.toFixed(2)} kg</td>

        <td>${rupiah(i.beli)}</td>

        <td>${rupiah(i.jual)}</td>

        <td>${rupiah(nilaiStok)}</td>

        <td>${rupiah(potensi)}</td>

        <td>${rupiah(laba)}</td>

      </tr>
      `;

  }

}


// ======================================================
// RINGKASAN
// ======================================================

function ringkasan() {

  let data =
    ambilPembelian();


  let hari =
    tanggal();


  let hariIni = 0;

  let semua = 0;


  data.forEach(x => {

    let uang =
      Number(x.uang) || 0;


    semua += uang;


    if (x.tanggal === hari) {

      hariIni += uang;

    }

  });


  let tgl =
    document.getElementById("tglhariini");


  let totalHari =
    document.getElementById(
      "totalpembelianhariini"
    );


  let total =
    document.getElementById(
      "totalpembelian"
    );


  if (tgl) {

    tgl.textContent = hari;

  }


  if (totalHari) {

    totalHari.textContent =
      rupiah(hariIni);

  }


  if (total) {

    total.textContent =
      rupiah(semua);

  }

}


// ======================================================
// RIWAYAT
// ======================================================

function riwayat() {

  let ul =
    document.getElementById(
      "riwayatpembelian"
    );


  if (!ul) return;


  ul.innerHTML = "";


  [
    ...ambilPembelian()
  ]
    .reverse()
    .slice(0, 10)
    .forEach(x => {


      let berat =
        Number(x.berat) || 0;


      let uang =
        Number(x.uang) || 0;


      ul.innerHTML +=
        `
        <li>

          ${x.tanggal || "-"} |
          ${x.jenis || "-"} |
          ${rupiah(uang)}
          (${berat.toFixed(2)} kg)

          <button
            onclick="hapusData('${x.id}')"
          >
            ❌
          </button>

        </li>
        `;

    });

}


// ======================================================
// HAPUS DATA
// ======================================================

window.hapusData =
  async function (id) {

    if (!id) return;


    let yakin =
      confirm(
        "Hapus pembelian ini?"
      );


    if (!yakin) return;


    // ----------------------------------------------
    // HAPUS DARI LOCAL TERLEBIH DAHULU
    // ----------------------------------------------

    let data =
      ambilPembelian()
        .filter(x => x.id !== id);


    simpanPembelian(data);


    // ----------------------------------------------
    // COBA HAPUS FIREBASE
    // ----------------------------------------------

    try {

      await deleteDoc(
        doc(
          db,
          "pembelianIkan",
          id
        )
      );


      // Berhasil
      hapusPendingDelete(id);


    } catch (error) {

      // Firebase gagal.
      // Data lokal tetap sudah dihapus,
      // tapi kita catat untuk dicoba lagi.

      tambahPendingDelete(id);

      console.log(
        "Penghapusan Firebase tertunda:",
        error
      );

    }


    tampilStok();
    riwayat();
    ringkasan();


    // Coba sync lagi
    sync();

  };


// ======================================================
// SYNC PENDING DELETE
// ======================================================

async function syncPendingDelete() {

  let pending =
    ambilPendingDelete();


  if (!pending.length) return;


  for (let id of pending) {

    try {

      await deleteDoc(
        doc(
          db,
          "pembelianIkan",
          id
        )
      );


      hapusPendingDelete(id);


    } catch (error) {

      console.log(
        "Belum bisa menghapus:",
        id
      );

    }

  }

}


// ======================================================
// SIMPAN / SYNC FIREBASE
// ======================================================

async function sync() {

  try {

    // --------------------------------------------
    // HAPUS DATA YANG TERTUNDA
    // --------------------------------------------

    await syncPendingDelete();


    // --------------------------------------------
    // KIRIM DATA LOCAL KE FIREBASE
    // --------------------------------------------

    let data =
      ambilPembelian();


    for (let x of data) {

      if (!x.id) continue;


      await setDoc(
        doc(
          db,
          "pembelianIkan",
          x.id
        ),
        x
      );

    }


    console.log(
      "Pembelian berhasil sync"
    );


    return true;

  } catch (error) {

    console.log(
      "Firebase belum tersedia:",
      error
    );


    return false;

  }

}


// ======================================================
// LOAD FIREBASE
// ======================================================

async function load() {

  try {

    let snap =
      await getDocs(
        collection(
          db,
          "pembelianIkan"
        )
      );


    let firebaseData = [];


    snap.forEach(x => {

      let item =
        x.data();


      // Pastikan ID selalu ada
      if (!item.id) {

        item.id = x.id;

      }


      firebaseData.push(item);

    });


    // --------------------------------------------
    // DATA LOCAL
    // --------------------------------------------

    let localData =
      ambilPembelian();


    // --------------------------------------------
    // DATA YANG SUDAH DIHAPUS
    // JANGAN DIHIDUPKAN LAGI
    // --------------------------------------------

    let pendingDelete =
      new Set(
        ambilPendingDelete()
      );


    // --------------------------------------------
    // GABUNGKAN BERDASARKAN ID
    // --------------------------------------------

    let gabungan =
      new Map();


    // Firebase dulu
    firebaseData.forEach(item => {

      if (
        item.id &&
        !pendingDelete.has(item.id)
      ) {

        gabungan.set(
          item.id,
          item
        );

      }

    });


    // Local menimpa Firebase
    // sehingga data lokal terbaru tidak hilang
    localData.forEach(item => {

      if (
        item.id &&
        !pendingDelete.has(item.id)
      ) {

        gabungan.set(
          item.id,
          item
        );

      }

    });


    let hasil =
      [...gabungan.values()];


    simpanPembelian(hasil);


    // --------------------------------------------
    // SETELAH MERGE, SYNC ULANG
    // --------------------------------------------

    await sync();


    return true;

  } catch (error) {

    console.log(
      "Gagal load Firebase. Menggunakan data lokal.",
      error
    );


    return false;

  }

}


// ======================================================
// VALIDASI PEMBELIAN
// ======================================================

function validasiPembelian(
  jenis,
  uang,
  harga
) {

  if (!jenis) {

    alert(
      "Pilih jenis ikan terlebih dahulu."
    );

    return false;

  }


  if (
    !Number.isFinite(uang) ||
    uang <= 0
  ) {

    alert(
      "Masukkan jumlah uang yang valid."
    );

    return false;

  }


  if (!harga) {

    alert(
      "Harga ikan belum ada."
    );

    return false;

  }


  let hargaBeli =
    Number(harga.beli);


  if (
    !Number.isFinite(hargaBeli) ||
    hargaBeli <= 0
  ) {

    alert(
      "Harga beli ikan tidak valid."
    );

    return false;

  }


  return true;

}


// ======================================================
// FORM TAMBAH
// ======================================================

let form =
  document.getElementById(
    "formpembelian"
  );


if (form) {

  form.addEventListener(
    "submit",
    async function (e) {

      e.preventDefault();


      // ------------------------------------------
      // AMBIL DATA
      // ------------------------------------------

      let jenis =
        document.getElementById(
          "pilihikan"
        ).value;


      let inputUang =
        document.querySelector(
          "[name='uang']"
        );


      let uang =
        Number(
          inputUang?.value
        );


      let harga =
        hargaTerakhir(jenis);


      // ------------------------------------------
      // VALIDASI
      // ------------------------------------------

      if (
        !validasiPembelian(
          jenis,
          uang,
          harga
        )
      ) {

        return;

      }


      // ------------------------------------------
      // HITUNG BERAT
      // ------------------------------------------

      let berat =
        uang /
        Number(harga.beli);


      if (
        !Number.isFinite(berat) ||
        berat <= 0
      ) {

        alert(
          "Berat pembelian tidak valid."
        );

        return;

      }


      // ------------------------------------------
      // BUAT TRANSAKSI
      // ------------------------------------------

      let transaksi = {

        id: buatID(),

        jenis: jenis,

        uang: uang,

        berat: berat,

        hargaBeli:
          Number(harga.beli),

        hargaJual:
          Number(harga.jual) || 0,

        tanggal:
          tanggal()

      };


      // ------------------------------------------
      // SIMPAN LOCAL DULU
      // ------------------------------------------

      let data =
        ambilPembelian();


      data.push(transaksi);


      simpanPembelian(data);


      // ------------------------------------------
      // TAMPILKAN SEGERA
      // ------------------------------------------

      tampilStok();

      riwayat();

      ringkasan();


      // ------------------------------------------
      // RESET FORM
      // ------------------------------------------

      e.target.reset();


      // ------------------------------------------
      // SYNC FIREBASE
      // ------------------------------------------

      await sync();

    }
  );

}


// ======================================================
// MULAI
// ======================================================

(async function () {

  // Tampilkan data lokal dulu
  // supaya aplikasi tidak kosong saat offline

  isiIkan();

  tampilStok();

  riwayat();

  ringkasan();


  // Kemudian coba ambil/sinkronkan Firebase

  await load();


  // Refresh tampilan setelah sync

  isiIkan();

  tampilStok();

  riwayat();

  ringkasan();

})();