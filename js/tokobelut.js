import { db } from "./firebase.js";
import { collection, getDocs } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===== FORMAT =====
const rupiah = n => "Rp " + Number(n || 0).toLocaleString("id-ID");

function formatTanggal(){
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(-2)}`;
}

// ===== FIRESTORE =====
async function getList(col){
  const snap = await getDocs(collection(db, col));
  const arr = [];
  snap.forEach(d => arr.push(d.data()));
  return arr;
}

// ===== AMBIL HARGA =====
function ambilHarga(){
  return JSON.parse(localStorage.getItem("dataIkan")) || [];
}

// ===== HITUNG MARGIN =====
function hitungMargin(hargaList){
  let totalLaba = 0;
  let totalJual = 0;

  hargaList.forEach(h => {
    const beli = Number(h.beli || 0);
    const jual = Number(h.jual || 0);

    totalLaba += (jual - beli);
    totalJual += jual;
  });

  return totalJual > 0 
    ? (totalLaba / totalJual) * 100 
    : 0;
}

// ===== LIMIT =====
const limit = (arr, n = 10) => arr.slice(-n).reverse();

// ===== MAIN =====
async function load(){

  const harga = ambilHarga();

  const [beliList, jualList, keluarList] = await Promise.all([
    getList("pembelianIkan"),
    getList("penjualanIkan"),
    getList("pengeluaran")
  ]);

  const margin = hitungMargin(harga);

  let totalPenjualan = 0;
  let totalPembelian = 0;
  let totalPengeluaran = 0;

  let penjualanHariIni = 0;
  let pengeluaranHariIni = 0;

  const today = formatTanggal();

  // =====================
  // PENJUALAN
  // =====================
  jualList.forEach(i => {
    const uang = Number(i.uang || 0);

    totalPenjualan += uang;

    if(i.tanggal === today){
      penjualanHariIni += uang;
    }
  });

  // =====================
  // PEMBELIAN (MODAL)
  // =====================
  beliList.forEach(i => {
    totalPembelian += Number(i.uang || 0);
  });

  // =====================
  // PENGELUARAN
  // =====================
  keluarList.forEach(i => {
    const uang = Number(i.uang || 0);

    totalPengeluaran += uang;

    if(i.tanggal === today){
      pengeluaranHariIni += uang;
    }
  });

  // =====================
  // SALDO TOKO (REAL)
  // =====================
  const saldoToko = totalPenjualan - totalPembelian - totalPengeluaran;

  // =====================
  // LABA
  // =====================
  const labaHariIni = penjualanHariIni * (margin / 100);

  // =====================
  // UI
  // =====================
  document.getElementById("penjualanhariini").textContent = rupiah(penjualanHariIni);
  document.getElementById("labahariini").textContent = rupiah(labaHariIni);
  document.getElementById("saldotoko").textContent = rupiah(saldoToko);
  document.getElementById("pengeluaranhariini").textContent = rupiah(pengeluaranHariIni);

  // =====================
  // RIWAYAT PEMBELIAN
  // =====================
  const tbBeli = document.querySelector("#riwayatPembelian tbody");
  tbBeli.innerHTML = limit(beliList).map(i => `
    <tr>
      <td>${i.tanggal}</td>
      <td>${i.jenis || "-"}</td>
      <td>${(+i.berat || 0).toFixed(2)}</td>
      <td>${rupiah(i.uang)}</td>
    </tr>
  `).join("");

  // =====================
  // RIWAYAT PENJUALAN
  // =====================
  const tbJual = document.querySelector("#riwayatPenjualan tbody");
  tbJual.innerHTML = limit(jualList).map(i => `
    <tr>
      <td>${i.tanggal}</td>
      <td>${i.jenis || "-"}</td>
      <td>${(+i.berat || 0).toFixed(2)}</td>
      <td>${rupiah(i.uang)}</td>
    </tr>
  `).join("");

  // =====================
  // RIWAYAT PENGELUARAN
  // =====================
  const tbKeluar = document.querySelector("#riwayatpengeluaran tbody");
  tbKeluar.innerHTML = limit(keluarList).map(i => `
    <tr>
      <td>${i.tanggal}</td>
      <td>${i.nama || "-"}</td>
      <td>${rupiah(i.uang)}</td>
    </tr>
  `).join("");

  // =====================
  // LABA PER IKAN
  // =====================
  const tbLaba = document.querySelector("#labaPerIkan tbody");
  tbLaba.innerHTML = "";

  limit(jualList).forEach(i => {

    const h = harga.find(x => x.jenis === i.jenis);
    if(!h) return;

    const laba = (Number(h.jual) - Number(h.beli)) * Number(i.berat || 0);

    tbLaba.innerHTML += `
      <tr>
        <td>${i.tanggal}</td>
        <td>${i.jenis}</td>
        <td>${(+i.berat || 0).toFixed(2)}</td>
        <td>${rupiah(laba)}</td>
      </tr>
    `;
  });

}

load();