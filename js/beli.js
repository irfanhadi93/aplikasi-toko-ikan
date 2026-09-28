// ======================================================
// PEMBELIAN IKAN
// ======================================================

import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ======================================================
// NORMALISASI NAMA IKAN
// ======================================================

function normalisasiJenis(nama) {

  return String(nama || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

}


// ======================================================
// STORAGE
// ======================================================

function ambilHarga() {

  try {

    return JSON.parse(
      localStorage.getItem("dataIkan")
    ) || [];

  } catch {

    return [];

  }

}


function ambilPembelian() {

  try {

    return JSON.parse(
      localStorage.getItem("pembelianIkan")
    ) || [];

  } catch {

    return [];

  }

}


function ambilPenjualan() {

  try {

    return JSON.parse(
      localStorage.getItem("penjualanIkan")
    ) || [];

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
      localStorage.getItem(
        "pendingDeletePembelian"
      )
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

  let data =
    ambilPendingDelete();


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
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {

    return crypto.randomUUID();

  }

  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2)
  );

}


// ======================================================
// DROPDOWN IKAN
// ======================================================
// Nama yang sama tetapi beda huruf/spasi
// hanya muncul satu kali.
// ======================================================

function isiIkan() {

  let select =
    document.getElementById(
      "pilihikan"
    );


  if (!select) return;


  let data =
    ambilHarga();


  let map =
    new Map();


  data.forEach(item => {

    if (!item.jenis) return;


    let nama =
      String(item.jenis)
        .trim()
        .replace(/\s+/g, " ");


    let key =
      normalisasiJenis(nama);


    if (!key) return;


    // Simpan nama pertama yang rapi
    if (!map.has(key)) {

      map.set(
        key,
        nama
      );

    }

  });


  select.innerHTML =
    '<option value="">-- pilih ikan --</option>';


  map.forEach(nama => {

    let option =
      document.createElement(
        "option"
      );


    option.value = nama;

    option.textContent = nama;


    select.appendChild(
      option
    );

  });

}


// ======================================================
// HARGA TERAKHIR
// ======================================================
// Semua variasi nama dianggap sama.
//
// Contoh:
// Belut
// belut
// BELUT
// " Belut "
//
// semuanya dicari sebagai:
// belut
//
// Data terakhir yang ditemukan digunakan.
// ======================================================

function hargaTerakhir(jenis) {

  let target =
    normalisasiJenis(jenis);


  let data =
    ambilHarga();


  let terakhir =
    null;


  data.forEach(item => {

    if (
      normalisasiJenis(item.jenis)
      === target
    ) {

      terakhir = item;

    }

  });


  return terakhir;

}


// ======================================================
// HITUNG STOK
// ======================================================

function hitungStok() {

  let hasil = {};


  // ====================================================
  // PEMBELIAN = STOK MASUK
  // ====================================================

  ambilPembelian()
    .forEach(item => {

      let namaAsli =
        String(item.jenis || "")
          .trim()
          .replace(/\s+/g, " ");


      if (!namaAsli) return;


      let key =
        normalisasiJenis(
          namaAsli
        );


      // Gabungkan nama yang sama
      if (!hasil[key]) {

        hasil[key] = {

          jenis: namaAsli,

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


      hasil[key].stok +=
        berat;


      hasil[key].totalBeratBeli +=
        berat;


      hasil[key].totalModal +=
        uang;

    });


  // ====================================================
  // HARGA MODAL + HARGA JUAL TERBARU
  // ====================================================

  for (let key in hasil) {

    let i =
      hasil[key];


    // --------------------------------------------------
    // MODAL RATA-RATA / KG
    // --------------------------------------------------

    if (
      i.totalBeratBeli > 0
    ) {

      i.beli =
        i.totalModal /
        i.totalBeratBeli;

    }


    // --------------------------------------------------
    // HARGA JUAL TERBARU
    // --------------------------------------------------

    let harga =
      hargaTerakhir(
        i.jenis
      );


    if (harga) {

      i.jual =
        Number(harga.jual) || 0;

    }

  }


  // ====================================================
  // PENJUALAN = STOK KELUAR
  // ====================================================

  ambilPenjualan()
    .forEach(item => {

      let namaAsli =
        String(item.jenis || "")
          .trim()
          .replace(/\s+/g, " ");


      if (!namaAsli) return;


      let key =
        normalisasiJenis(
          namaAsli
        );


      if (!hasil[key]) return;


      let berat =
        Number(item.berat) || 0;


      hasil[key].stok -=
        berat;

    });


  // ====================================================
  // CEGAH ANGKA -0
  // ====================================================

  for (let key in hasil) {

    if (
      hasil[key].stok > -0.0001 &&
      hasil[key].stok < 0.0001
    ) {

      hasil[key].stok = 0;

    }

  }


  return hasil;

}


// ======================================================
// TAMPIL STOK
// ======================================================

function tampilStok() {

  let tabel =
    document.getElementById(
      "tabelstok"
    );


  if (!tabel) return;


  tabel.innerHTML = "";


  let data =
    hitungStok();


  for (let key in data) {

    let i =
      data[key];


    let stok =
      Math.max(
        0,
        i.stok
      );


    let nilaiStok =
      stok * i.beli;


    let potensi =
      stok * i.jual;


    let laba =
      potensi - nilaiStok;


    tabel.innerHTML +=
      `
      <tr>

        <td>
          ${i.jenis}
        </td>

        <td>
          ${stok.toFixed(2)} kg
        </td>

        <td>
          ${rupiah(i.beli)}
        </td>

        <td>
          ${rupiah(i.jual)}
        </td>

        <td>
          ${rupiah(nilaiStok)}
        </td>

        <td>
          ${rupiah(potensi)}
        </td>

        <td>
          ${rupiah(laba)}
        </td>

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


    if (
      x.tanggal === hari
    ) {

      hariIni += uang;

    }

  });


  let tgl =
    document.getElementById(
      "tglhariini"
    );


  let totalHari =
    document.getElementById(
      "totalpembelianhariini"
    );


  let total =
    document.getElementById(
      "totalpembelian"
    );


  if (tgl) {

    tgl.textContent =
      hari;

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
    // HAPUS LOCAL TERLEBIH DAHULU
    // ----------------------------------------------

    let data =
      ambilPembelian()
        .filter(
          x => x.id !== id
        );


    simpanPembelian(
      data
    );


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


      hapusPendingDelete(
        id
      );


    } catch (error) {

      tambahPendingDelete(
        id
      );


      console.log(
        "Penghapusan Firebase tertunda:",
        error
      );

    }


    tampilStok();

    riwayat();

    ringkasan();


    sync();

  };


// ======================================================
// SYNC PENDING DELETE
// ======================================================

async function syncPendingDelete() {

  let pending =
    ambilPendingDelete();


  if (!pending.length) return;


  for (
    let id of pending
  ) {

    try {

      await deleteDoc(
        doc(
          db,
          "pembelianIkan",
          id
        )
      );


      hapusPendingDelete(
        id
      );


    } catch (error) {

      console.log(
        "Belum bisa menghapus:",
        id
      );

    }

  }

}


// ======================================================
// SYNC FIREBASE
// ======================================================

async function sync() {

  try {

    await syncPendingDelete();


    let data =
      ambilPembelian();


    for (
      let x of data
    ) {

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


      if (!item.id) {

        item.id =
          x.id;

      }


      firebaseData.push(
        item
      );

    });


    // --------------------------------------------
    // LOCAL
    // --------------------------------------------

    let localData =
      ambilPembelian();


    // --------------------------------------------
    // PENDING DELETE
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


    firebaseData.forEach(item => {

      if (
        item.id &&
        !pendingDelete.has(
          item.id
        )
      ) {

        gabungan.set(
          item.id,
          item
        );

      }

    });


    localData.forEach(item => {

      if (
        item.id &&
        !pendingDelete.has(
          item.id
        )
      ) {

        gabungan.set(
          item.id,
          item
        );

      }

    });


    let hasil =
      [...gabungan.values()];


    simpanPembelian(
      hasil
    );


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
    Number(
      harga.beli
    );


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
        hargaTerakhir(
          jenis
        );


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
        Number(
          harga.beli
        );


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
      // TRANSAKSI
      // ------------------------------------------

      let transaksi = {

        id:
          buatID(),

        jenis:
          jenis
            .trim()
            .replace(
              /\s+/g,
              " "
            ),

        uang:
          uang,

        berat:
          berat,

        hargaBeli:
          Number(
            harga.beli
          ),

        hargaJual:
          Number(
            harga.jual
          ) || 0,

        tanggal:
          tanggal()

      };


      // ------------------------------------------
      // LOCAL
      // ------------------------------------------

      let data =
        ambilPembelian();


      data.push(
        transaksi
      );


      simpanPembelian(
        data
      );


      // ------------------------------------------
      // REFRESH
      // ------------------------------------------

      tampilStok();

      riwayat();

      ringkasan();


      // ------------------------------------------
      // RESET
      // ------------------------------------------

      e.target.reset();


      // ------------------------------------------
      // FIREBASE
      // ------------------------------------------

      await sync();

    }
  );

}


// ======================================================
// MULAI
// ======================================================

(async function () {

  // --------------------------------------------
  // TAMPILKAN LOCAL DULU
  // --------------------------------------------

  isiIkan();

  tampilStok();

  riwayat();

  ringkasan();


  // --------------------------------------------
  // LOAD FIREBASE
  // --------------------------------------------

  await load();


  // --------------------------------------------
  // REFRESH
  // --------------------------------------------

  isiIkan();

  tampilStok();

  riwayat();

  ringkasan();

})();