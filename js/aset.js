// ======================================================
// ASET.JS
// ======================================================

import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ======================================================
// FORMAT
// ======================================================

function rupiah(nilai) {

  return "Rp " +
    Number(nilai || 0)
      .toLocaleString("id-ID");

}


function angka(nilai) {

  return Number(nilai || 0)
    .toFixed(2);

}


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
// LOCAL STORAGE
// ======================================================

function ambilLocal(key) {

  try {

    return JSON.parse(
      localStorage.getItem(key)
    ) || [];

  } catch {

    return [];

  }

}


// ======================================================
// FIREBASE
// ======================================================

async function ambilFirebase(nama) {

  try {

    const snap =
      await getDocs(
        collection(db, nama)
      );

    const hasil = [];

    snap.forEach(docSnap => {

      hasil.push({
        ...docSnap.data(),
        id: docSnap.id
      });

    });

    return hasil;

  } catch (error) {

    console.log(
      "Firebase gagal:",
      nama,
      error
    );

    return [];

  }

}


// ======================================================
// GABUNG DATA
// ======================================================

function gabungkan(firebaseData, localData) {

  const map = new Map();


  firebaseData.forEach(item => {

    if (item.id) {

      map.set(
        item.id,
        item
      );

    }

  });


  localData.forEach(item => {

    if (item.id) {

      map.set(
        item.id,
        item
      );

    }

  });


  return [...map.values()];

}


// ======================================================
// HARGA TERBARU
// ======================================================
// Semua variasi nama dianggap sama.
// Contoh:
// Belut
// belut
// BELUT
// " Belut "
//
// semuanya dianggap:
// belut
//
// Jika ada beberapa data harga,
// data terakhir yang ditemukan dipakai.
// ======================================================

function hargaTerbaru(jenis, dataHarga) {

  const target =
    normalisasiJenis(jenis);


  let terakhir = null;


  dataHarga.forEach(item => {

    if (
      normalisasiJenis(item.jenis)
      === target
    ) {

      terakhir = item;

    }

  });


  if (!terakhir) {

    return {

      beli: 0,

      jual: 0

    };

  }


  return {

    beli:
      Number(terakhir.beli) || 0,

    jual:
      Number(terakhir.jual) || 0

  };

}


// ======================================================
// HITUNG
// ======================================================

async function hitungAset() {

  // ====================================================
  // DATA LOCAL
  // ====================================================

  const localPembelian =
    ambilLocal("pembelianIkan");


  const localPenjualan =
    ambilLocal("penjualanIkan");


  const localPengeluaran =
    ambilLocal("pengeluaran");


  const dataHarga =
    ambilLocal("dataIkan");


  // ====================================================
  // DATA FIREBASE
  // ====================================================

  const firebasePembelian =
    await ambilFirebase(
      "pembelianIkan"
    );


  const firebasePenjualan =
    await ambilFirebase(
      "penjualanIkan"
    );


  const firebasePengeluaran =
    await ambilFirebase(
      "pengeluaran"
    );


  // ====================================================
  // GABUNG
  // ====================================================

  const pembelian =
    gabungkan(
      firebasePembelian,
      localPembelian
    );


  const penjualan =
    gabungkan(
      firebasePenjualan,
      localPenjualan
    );


  const pengeluaran =
    gabungkan(
      firebasePengeluaran,
      localPengeluaran
    );


  // ====================================================
  // SALDO UANG
  // ====================================================

  let totalPenjualan = 0;

  let totalPembelian = 0;

  let totalPengeluaran = 0;


  penjualan.forEach(item => {

    totalPenjualan +=
      Number(item.uang) || 0;

  });


  pembelian.forEach(item => {

    totalPembelian +=
      Number(item.uang) || 0;

  });


  pengeluaran.forEach(item => {

    totalPengeluaran +=
      Number(item.uang) || 0;

  });


  const saldoToko =
    totalPenjualan
    - totalPembelian
    - totalPengeluaran;


  // ====================================================
  // STOK PER JENIS
  // ====================================================

  const stokMap = {};


  // ====================================================
  // PEMBELIAN
  // ====================================================

  pembelian.forEach(item => {

    const namaAsli =
      String(item.jenis || "")
        .trim();

    if (!namaAsli) return;


    // KUNCI NORMALISASI
    const key =
      normalisasiJenis(namaAsli);


    // Kalau belum ada, buat.
    // Kalau sudah ada, gabungkan.
    if (!stokMap[key]) {

      stokMap[key] = {

        // Nama pertama yang ditemukan
        jenis: namaAsli,

        masuk: 0,

        keluar: 0,

        modal: 0

      };

    }


    const berat =
      Number(item.berat) || 0;


    const uang =
      Number(item.uang) || 0;


    // Tambah stok fisik
    stokMap[key].masuk +=
      berat;


    // Tambah total modal
    stokMap[key].modal +=
      uang;

  });


  // ====================================================
  // PENJUALAN
  // ====================================================

  penjualan.forEach(item => {

    const namaAsli =
      String(item.jenis || "")
        .trim();

    if (!namaAsli) return;


    // KUNCI NORMALISASI
    const key =
      normalisasiJenis(namaAsli);


    if (!stokMap[key]) {

      stokMap[key] = {

        jenis: namaAsli,

        masuk: 0,

        keluar: 0,

        modal: 0

      };

    }


    const berat =
      Number(item.berat) || 0;


    // Kurangi stok fisik
    stokMap[key].keluar +=
      berat;

  });


  // ====================================================
  // HASIL
  // ====================================================

  let totalKg = 0;

  let totalNilaiModal = 0;

  let totalPotensiJual = 0;

  let totalPotensiLaba = 0;


  const daftar = [];


  // ====================================================
  // LOOP SETIAP JENIS IKAN
  // ====================================================

  for (const key in stokMap) {

    const item =
      stokMap[key];


    const namaIkan =
      item.jenis;


    // ----------------------------------------------
    // STOK FISIK
    // ----------------------------------------------

    const stok =
      item.masuk
      - item.keluar;


    // ----------------------------------------------
    // MODAL RATA-RATA / KG
    // ----------------------------------------------

    let modalPerKg = 0;


    if (item.masuk > 0) {

      modalPerKg =
        item.modal
        / item.masuk;

    }


    // ----------------------------------------------
    // HARGA JUAL TERBARU
    // ----------------------------------------------

    const harga =
      hargaTerbaru(
        namaIkan,
        dataHarga
      );


    const hargaJual =
      harga.jual;


    // ----------------------------------------------
    // STOK AMAN
    // ----------------------------------------------

    const stokAman =
      Math.max(
        0,
        stok
      );


    // ----------------------------------------------
    // NILAI MODAL STOK
    // ----------------------------------------------

    const nilaiModal =
      stokAman
      * modalPerKg;


    // ----------------------------------------------
    // POTENSI JUAL
    // ----------------------------------------------

    const potensiJual =
      stokAman
      * hargaJual;


    // ----------------------------------------------
    // POTENSI LABA
    // ----------------------------------------------

    const potensiLaba =
      potensiJual
      - nilaiModal;


    // ----------------------------------------------
    // TOTAL
    // ----------------------------------------------

    totalKg +=
      stokAman;


    totalNilaiModal +=
      nilaiModal;


    totalPotensiJual +=
      potensiJual;


    totalPotensiLaba +=
      potensiLaba;


    // ----------------------------------------------
    // MASUKKAN KE DAFTAR
    // ----------------------------------------------

    daftar.push({

      jenis: namaIkan,

      stok: stokAman,

      modalPerKg,

      nilaiModal,

      hargaJual,

      potensiJual,

      potensiLaba

    });

  }


  // ====================================================
  // TOTAL ASET
  // ====================================================

  // Aset = uang yang tersedia
  //       + nilai stok berdasarkan modal
  //
  // BUKAN berdasarkan potensi harga jual.

  const totalAset =
    saldoToko
    + totalNilaiModal;


  // ====================================================
  // RINGKASAN
  // ====================================================

  const saldo =
    document.getElementById(
      "saldoToko"
    );


  const stok =
    document.getElementById(
      "totalStok"
    );


  const potensi =
    document.getElementById(
      "totalPotensiJual"
    );


  const aset =
    document.getElementById(
      "totalAset"
    );


  if (saldo) {

    saldo.textContent =
      rupiah(saldoToko);

  }


  if (stok) {

    stok.textContent =
      angka(totalKg)
      + " kg";

  }


  if (potensi) {

    potensi.textContent =
      rupiah(totalPotensiJual);

  }


  if (aset) {

    aset.textContent =
      rupiah(totalAset);

  }


  // ====================================================
  // TABEL DETAIL
  // ====================================================

  const tabel =
    document.getElementById(
      "tabelAset"
    );


  if (tabel) {

    tabel.innerHTML = "";


    if (!daftar.length) {

      tabel.innerHTML = `
        <tr>
          <td colspan="7">
            Belum ada stok
          </td>
        </tr>
      `;

    }


    daftar.forEach(item => {

      const tr =
        document.createElement(
          "tr"
        );


      tr.innerHTML = `

        <td>
          ${item.jenis}
        </td>

        <td>
          ${angka(item.stok)} kg
        </td>

        <td>
          ${rupiah(item.modalPerKg)}
        </td>

        <td>
          ${rupiah(item.nilaiModal)}
        </td>

        <td>
          ${rupiah(item.hargaJual)}
        </td>

        <td>
          ${rupiah(item.potensiJual)}
        </td>

        <td>
          ${rupiah(item.potensiLaba)}
        </td>

      `;


      tabel.appendChild(tr);

    });

  }


  // ====================================================
  // LIST STOK
  // ====================================================

  const ul =
    document.getElementById(
      "daftarStok"
    );


  if (ul) {

    ul.innerHTML = "";


    if (!daftar.length) {

      ul.innerHTML =
        "<li>Belum ada stok</li>";

    }


    daftar.forEach(item => {

      const li =
        document.createElement(
          "li"
        );


      li.textContent =
        `${item.jenis} — ` +
        `${angka(item.stok)} kg | ` +
        `Modal ${rupiah(item.nilaiModal)} | ` +
        `Jual ${rupiah(item.potensiJual)} | ` +
        `Laba ${rupiah(item.potensiLaba)}`;


      ul.appendChild(li);

    });

  }


  // ====================================================
  // DEBUG
  // ====================================================

  console.log(
    "===== ASET ====="
  );


  console.log(
    "Saldo uang:",
    saldoToko
  );


  console.log(
    "Stok fisik:",
    totalKg,
    "kg"
  );


  console.log(
    "Nilai modal stok:",
    totalNilaiModal
  );


  console.log(
    "Potensi jual:",
    totalPotensiJual
  );


  console.log(
    "Potensi laba:",
    totalPotensiLaba
  );


  console.log(
    "Total aset:",
    totalAset
  );


  console.log(
    "Detail stok:",
    daftar
  );


  return {

    saldoToko,

    totalKg,

    totalNilaiModal,

    totalPotensiJual,

    totalPotensiLaba,

    totalAset,

    daftar

  };

}


// ======================================================
// JALANKAN
// ======================================================

hitungAset();


// ======================================================
// REFRESH MANUAL
// ======================================================

window.refreshAset =
  function () {

    hitungAset();

  };