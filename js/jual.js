import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================================
// STORAGE
// =====================================================

function ambilPembelian(){
  return JSON.parse(localStorage.getItem("pembelianIkan")) || [];
}

function ambilPenjualan(){
  return JSON.parse(localStorage.getItem("penjualanIkan")) || [];
}

function ambilHarga(){
  return JSON.parse(localStorage.getItem("dataIkan")) || [];
}

function simpanPenjualan(data){
  localStorage.setItem(
    "penjualanIkan",
    JSON.stringify(data)
  );
}


// =====================================================
// NORMALISASI NAMA IKAN
// =====================================================

function normalJenis(nama){

  return String(nama || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

}


// =====================================================
// CARI MASTER HARGA TERBARU
// =====================================================

function hargaMaster(jenis){

  let key = normalJenis(jenis);

  let data = ambilHarga();

  /*
    Cari berdasarkan nama yang sudah dinormalisasi.
    Jadi:
    Belut
    Belut 
    BELUT
    Belut   Gabus

    tidak mudah dianggap sebagai nama berbeda.
  */

  return data.find(item =>
    normalJenis(item.jenis) === key
  ) || null;

}


// =====================================================
// FORMAT
// =====================================================

function rupiah(nilai){

  return "Rp " + Number(nilai || 0)
    .toLocaleString("id-ID");

}


function tanggal(){

  let t = new Date();

  return (
    String(t.getDate()).padStart(2,"0")
    + "/" +
    String(t.getMonth()+1).padStart(2,"0")
    + "/" +
    String(t.getFullYear()).slice(-2)
  );

}


// =====================================================
// ID
// =====================================================

function buatID(){

  return crypto.randomUUID();

}


// =====================================================
// HITUNG STOK
// =====================================================

function hitungStok(){

  let hasil = {};

  // ==========================================
  // 1. AMBIL STOK DARI PEMBELIAN
  // ==========================================

  ambilPembelian().forEach(item => {

    let key = normalJenis(item.jenis);

    if(!key) return;


    if(!hasil[key]){

      hasil[key] = {

        jenis: item.jenis,

        stok: 0,

        beli: 0,

        jual: 0

      };

    }


    hasil[key].stok +=
      Number(item.berat || 0);

  });


  // ==========================================
  // 2. KURANGI DENGAN PENJUALAN
  // ==========================================

  ambilPenjualan().forEach(item => {

    let key = normalJenis(item.jenis);

    if(!hasil[key]) return;


    hasil[key].stok -=
      Number(item.berat || 0);

  });


  // ==========================================
  // 3. AMBIL HARGA TERBARU DARI MASTER
  // ==========================================

  Object.keys(hasil).forEach(key => {

    let item = hasil[key];

    let master =
      hargaMaster(item.jenis);


    if(master){

      /*
        INI BAGIAN PENTING.

        Harga yang tampil di stok dan
        dropdown selalu mengambil harga
        TERBARU dari dataIkan.
      */

      item.jenis = master.jenis;

      item.beli =
        Number(master.beli || 0);

      item.jual =
        Number(master.jual || 0);

    }

  });


  return hasil;

}


// =====================================================
// DROPDOWN
// =====================================================

function isiDropdown(){

  const select =
    document.getElementById("pilihikan");


  const stok =
    hitungStok();


  select.innerHTML =
    '<option value="">-- Pilih Ikan --</option>';


  for(let key in stok){

    let item = stok[key];


    if(item.stok > 0){

      let opt =
        document.createElement("option");


      /*
        value memakai key normalisasi
        supaya pencarian stok konsisten.
      */

      opt.value = key;

      opt.textContent =
        item.jenis;


      select.appendChild(opt);

    }

  }

}


// =====================================================
// TABEL STOK
// =====================================================

function tampilStok(){

  let tabel =
    document.getElementById("tabelstok");


  tabel.innerHTML = "";


  let data =
    hitungStok();


  for(let key in data){

    let item =
      data[key];


    /*
      Jangan tampilkan stok kosong
    */

    if(item.stok <= 0) continue;


    let nilai =
      item.stok * item.beli;


    let potensi =
      item.stok * item.jual;


    let laba =
      potensi - nilai;


    tabel.innerHTML += `

      <tr>

        <td>${item.jenis}</td>

        <td>${item.stok.toFixed(2)} kg</td>

        <td>${rupiah(item.beli)}</td>

        <td>${rupiah(item.jual)}</td>

        <td>${rupiah(nilai)}</td>

        <td>${rupiah(potensi)}</td>

        <td>${rupiah(laba)}</td>

      </tr>

    `;

  }

}


// =====================================================
// RINGKASAN
// =====================================================

function ringkasan(){

  let data =
    ambilPenjualan();


  let hari =
    tanggal();


  let hariIni = 0;

  let semua = 0;


  data.forEach(item => {

    semua +=
      Number(item.uang || 0);


    if(item.tanggal === hari){

      hariIni +=
        Number(item.uang || 0);

    }

  });


  document.getElementById("tglhariini")
    .textContent = hari;


  document.getElementById("totalpenjualanhariini")
    .textContent = rupiah(hariIni);


  document.getElementById("totalpenjualan")
    .textContent = rupiah(semua);

}


// =====================================================
// RIWAYAT
// =====================================================

function tampilRiwayat(){

  let ul =
    document.getElementById("riwayatpenjualan");


  ul.innerHTML = "";


  let data =
    [...ambilPenjualan()]
      .reverse()
      .slice(0,10);


  data.forEach(item => {

    ul.innerHTML += `

      <li>

        ${item.tanggal}
        |
        ${item.jenis}
        |
        ${rupiah(item.uang)}

        (${Number(item.berat || 0).toFixed(2)} kg)

        <button
          onclick="hapusPenjualan('${item.id}')">
          ❌
        </button>

      </li>

    `;

  });

}


// =====================================================
// HAPUS
// =====================================================

window.hapusPenjualan =
async function(id){

  await deleteDoc(
    doc(db,"penjualanIkan",id)
  ).catch(()=>{});


  let data =
    ambilPenjualan()
      .filter(x => x.id !== id);


  simpanPenjualan(data);


  tampilStok();

  isiDropdown();

  tampilRiwayat();

  ringkasan();

};


// =====================================================
// FORM PENJUALAN
// =====================================================

document
  .getElementById("formpenjualan")
  .addEventListener("submit", async e => {

    e.preventDefault();


    let key =
      document.getElementById("pilihikan").value;


    let uang =
      Number(
        document.querySelector("[name='uang']").value
      );


    let stok =
      hitungStok()[key];


    if(!stok){

      alert("Ikan tidak tersedia");

      return;

    }


    // ==========================================
    // CEK HARGA
    // ==========================================

    if(stok.jual <= 0){

      alert("Harga jual ikan belum diatur");

      return;

    }


    // ==========================================
    // HITUNG BERAT
    // ==========================================

    let berat =
      uang / stok.jual;


    if(berat > stok.stok){

      alert("Stok tidak cukup");

      return;

    }


    // ==========================================
    // DATA PENJUALAN
    // ==========================================

    let item = {

      id: buatID(),

      jenis: stok.jenis,

      uang: uang,

      berat: berat,

      /*
        Harga saat transaksi dicatat.
        Jadi RIWAYAT penjualan tidak berubah
        walaupun harga master nanti berubah.
      */

      hargaBeli: stok.beli,

      hargaJual: stok.jual,

      tanggal: tanggal()

    };


    let data =
      ambilPenjualan();


    data.push(item);


    simpanPenjualan(data);


    await setDoc(
      doc(db,"penjualanIkan",item.id),
      item
    );


    tampilStok();

    isiDropdown();

    tampilRiwayat();

    ringkasan();


    e.target.reset();

  });


// =====================================================
// LOAD FIREBASE
// =====================================================

async function loadFirebase(){

  try{

    let snap =
      await getDocs(
        collection(db,"penjualanIkan")
      );


    let data = [];


    snap.forEach(x => {

      data.push(x.data());

    });


    if(data.length){

      simpanPenjualan(data);

    }

  }catch(error){

    console.error(
      "Gagal mengambil penjualan:",
      error
    );

  }

}


// =====================================================
// UPDATE TAMPILAN
// =====================================================

function refresh(){

  isiDropdown();

  tampilStok();

  tampilRiwayat();

  ringkasan();

}


// =====================================================
// START
// =====================================================

(async()=>{

  await loadFirebase();

  refresh();

})();