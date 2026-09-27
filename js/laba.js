import { db } from "./firebase.js";
import { collection, getDocs } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===== FORMAT =====
const rupiah = n => "Rp " + Number(n || 0).toLocaleString("id-ID");

// ===== TANGGAL =====
function getToday(){
  const d = new Date();
  return {
    hari: String(d.getDate()).padStart(2,"0"),
    bulan: String(d.getMonth()+1).padStart(2,"0"),
    tahun: String(d.getFullYear()).slice(-2)
  };
}

function parseTanggal(str){
  const [d,m,y] = str.split("/");
  return { hari:d, bulan:m, tahun:y };
}

// ===== FIRESTORE =====
async function getList(nama){
  const snap = await getDocs(collection(db, nama));
  const arr = [];
  snap.forEach(d => arr.push(d.data()));
  return arr;
}

// ===== HARGA =====
function ambilHarga(){
  return JSON.parse(localStorage.getItem("dataIkan")) || [];
}

// ===== MARGIN =====
function hitungMargin(list){
  let laba = 0, jual = 0;

  list.forEach(h=>{
    laba += (Number(h.jual) - Number(h.beli));
    jual += Number(h.jual);
  });

  return jual > 0 ? laba / jual : 0;
}

// ===== HELPER PER IKAN =====
function addPerIkan(obj, jenis, berat, untung){
  if(!obj[jenis]){
    obj[jenis] = { berat:0, untungPerKg:untung, laba:0 };
  }

  obj[jenis].berat += berat;
  obj[jenis].laba += berat * untung;
}

// ===== RENDER TABLE =====
function renderTable(id, data){
  const el = document.getElementById(id);
  el.innerHTML = "";

  Object.keys(data).forEach(jenis=>{
    el.innerHTML += `
      <tr>
        <td>${jenis}</td>
        <td>${data[jenis].berat.toFixed(2)}</td>
        <td>${rupiah(data[jenis].untungPerKg)}</td>
        <td>${rupiah(data[jenis].laba)}</td>
      </tr>
    `;
  });
}

// ===== MAIN =====
async function load(){

  const today = getToday();

  const jual = await getList("penjualanIkan");
  const harga = ambilHarga();

  const margin = hitungMargin(harga);

  let totalPenjualan = 0;
  let jualHarian = 0;
  let jualBulanan = 0;
  let jualTahunan = 0;

  let hariSet = new Set();
  let bulanSet = new Set();
  let tahunSet = new Set();

  let perIkanHarian = {};
  let perIkanBulanan = {};
  let perIkanTahunan = {};

  // ===== LOOP =====
  jual.forEach(i=>{
    const uang = Number(i.uang || 0);
    const berat = Number(i.berat || 0);
    const t = parseTanggal(i.tanggal);

    totalPenjualan += uang;

    const h = harga.find(x => x.jenis === i.jenis);
    if(!h) return;

    const untung = Number(h.jual) - Number(h.beli);

    // grouping
    hariSet.add(i.tanggal);
    bulanSet.add(t.bulan + "/" + t.tahun);
    tahunSet.add(t.tahun);

    // ===== HARIAN =====
    if(
      t.hari === today.hari &&
      t.bulan === today.bulan &&
      t.tahun === today.tahun
    ){
      jualHarian += uang;
      addPerIkan(perIkanHarian, i.jenis, berat, untung);
    }

    // ===== BULANAN =====
    if(t.bulan === today.bulan && t.tahun === today.tahun){
      jualBulanan += uang;
      addPerIkan(perIkanBulanan, i.jenis, berat, untung);
    }

    // ===== TAHUNAN =====
    if(t.tahun === today.tahun){
      jualTahunan += uang;
      addPerIkan(perIkanTahunan, i.jenis, berat, untung);
    }

  });

  // ===== LABA =====
  const labaTotal = totalPenjualan * margin;
  const labaHarian = jualHarian * margin;
  const labaBulanan = jualBulanan * margin;
  const labaTahunan = jualTahunan * margin;

  // ===== RATA =====
  const rataHarian = hariSet.size ? labaTotal / hariSet.size : 0;
  const rataBulanan = bulanSet.size ? labaTotal / bulanSet.size : 0;
  const rataTahunan = tahunSet.size ? labaTotal / tahunSet.size : 0;

  // ===== UI =====
  document.getElementById("labatotal").textContent = rupiah(labaTotal);
  document.getElementById("labahariini").textContent = rupiah(labaHarian);
  document.getElementById("rata-ratalabaharian").textContent = rupiah(rataHarian);

  document.getElementById("lababulanini").textContent = rupiah(labaBulanan);
  document.getElementById("rata-ratalababulanan").textContent = rupiah(rataBulanan);

  document.getElementById("labatahunan").textContent = rupiah(labaTahunan);
  document.getElementById("rata-ratalabatahunan").textContent = rupiah(rataTahunan);

  document.getElementById("margin").textContent = (margin * 100).toFixed(1) + " %";

  // ===== TABLE =====
  renderTable("labaperikanharian", perIkanHarian);
  renderTable("labaperikanbulanan", perIkanBulanan);
  renderTable("labaperikantahunan", perIkanTahunan);

  // ===== RIWAYAT (FIX TABLE) =====
  const tbody = document.getElementById("riwayatlaba");
  tbody.innerHTML = "";

  jual.slice(-10).reverse().forEach(i=>{
    const h = harga.find(x => x.jenis === i.jenis);
    if(!h) return;

    const laba = (h.jual - h.beli) * Number(i.berat || 0);

    tbody.innerHTML += `
      <tr>
        <td>${i.tanggal}</td>
        <td>${i.jenis}</td>
        <td>${(+i.berat || 0).toFixed(2)}</td>
        <td>${rupiah(laba)}</td>
      </tr>
    `;
  });

}

// ===== RUN =====
load();