// =====================================================
// STORAGE
// =====================================================

function ambilPembelian(){

  return JSON.parse(
    localStorage.getItem("pembelianIkan")
  ) || [];

}


function ambilPenjualan(){

  return JSON.parse(
    localStorage.getItem("penjualanIkan")
  ) || [];

}


function ambilHarga(){

  return JSON.parse(
    localStorage.getItem("dataIkan")
  ) || [];

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
// CARI HARGA MASTER TERBARU
// =====================================================

function hargaMaster(jenis){

  let key =
    normalJenis(jenis);


  let data =
    ambilHarga();


  return data.find(item =>
    normalJenis(item.jenis) === key
  ) || null;

}


// =====================================================
// FORMAT
// =====================================================

function rupiah(nilai){

  return "Rp " +
    Number(nilai || 0)
    .toLocaleString("id-ID");

}


function tanggalHariIni(){

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
// HITUNG STOK
// =====================================================

function hitungStok(){

  let hasil = {};


  // ===================================================
  // 1. TAMBAH SEMUA PEMBELIAN
  // ===================================================

  ambilPembelian()
  .forEach(item => {

    let key =
      normalJenis(item.jenis);


    if(!key) return;


    if(!hasil[key]){

      hasil[key] = {

        jenis: item.jenis,

        stok: 0,

        beli: 0,

        jual: 0,

        modal: 0

      };

    }


    // jumlah stok

    hasil[key].stok +=
      Number(item.berat || 0);


    // total uang pembelian
    // tetap disimpan untuk data lama

    hasil[key].modal +=
      Number(item.uang || 0);

  });


  // ===================================================
  // 2. KURANGI PENJUALAN
  // ===================================================

  ambilPenjualan()
  .forEach(item => {

    let key =
      normalJenis(item.jenis);


    if(hasil[key]){

      hasil[key].stok -=
        Number(item.berat || 0);

    }

  });


  // ===================================================
  // 3. AMBIL HARGA MASTER TERBARU
  // ===================================================

  Object.keys(hasil)
  .forEach(key => {

    let item =
      hasil[key];


    let master =
      hargaMaster(item.jenis);


    if(master){

      // gunakan nama dari master

      item.jenis =
        master.jenis;


      // HARGA TERBARU

      item.beli =
        Number(master.beli || 0);


      item.jual =
        Number(master.jual || 0);

    }

  });


  return hasil;

}


// =====================================================
// TAMPIL TABEL
// =====================================================

function tampilStok(){

  const tabel =
    document.getElementById("tabelstok");


  if(!tabel) return;


  tabel.innerHTML = "";


  let data =
    hitungStok();


  for(let key in data){

    let item =
      data[key];


    // jangan tampilkan stok habis

    if(item.stok <= 0)
      continue;


    // =================================================
    // NILAI STOK
    // =================================================

    let nilaiStok =
      item.stok * item.beli;


    // =================================================
    // POTENSI JUAL
    // =================================================

    let potensiJual =
      item.stok * item.jual;


    // =================================================
    // LABA
    // =================================================

    let laba =
      potensiJual - nilaiStok;


    // =================================================
    // TAMPILKAN
    // =================================================

    tabel.innerHTML += `

      <tr>

        <td>${item.jenis}</td>

        <td>
          ${item.stok.toFixed(2)} kg
        </td>

        <td>
          ${rupiah(item.beli)}
        </td>

        <td>
          ${rupiah(item.jual)}
        </td>

        <td>
          ${rupiah(nilaiStok)}
        </td>

        <td>
          ${rupiah(potensiJual)}
        </td>

        <td>
          ${rupiah(laba)}
        </td>

        <td>
          ${tanggalHariIni()}
        </td>

      </tr>

    `;

  }


  // ===================================================
  // UNTUK grafik-stok.js
  // ===================================================

  window.dataStokGrafik =
    data;

}


// =====================================================
// LOAD AWAL
// =====================================================

tampilStok();


// =====================================================
// UPDATE JIKA STORAGE BERUBAH
// =====================================================

window.addEventListener(
  "storage",
  () => {

    tampilStok();

  }
);