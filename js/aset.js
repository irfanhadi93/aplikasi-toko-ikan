// ===== FIREBASE =====
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===== FORMAT =====
function rupiah(num) {
  return "Rp " + Number(num || 0).toLocaleString("id-ID");
}

// ===== AMBIL DATA FIRESTORE (AMAN + ANTI DUPLIKAT LOGIC) =====
async function getData(collectionName) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));

    const list = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      list.push({
        ...data,
        id: docSnap.id
      });
    });

    return list;

  } catch (err) {
    console.error("Error:", collectionName, err);
    return [];
  }
}

// ===== HITUNG TOTAL =====
function sum(arr, field) {
  return arr.reduce((total, item) => {
    const val = Number(item?.[field] || 0);
    return total + (isNaN(val) ? 0 : val);
  }, 0);
}

// ===== HITUNG ASET =====
async function hitungAset() {
  try {
    // ===== AMBIL DATA =====
    const penjualan = await getData("penjualanIkan");
    const pembelian = await getData("pembelianIkan");
    const pengeluaran = await getData("pengeluaran");

    // ===== TOTAL KEUANGAN =====
    const totalPenjualan = sum(penjualan, "uang");
    const totalPembelian = sum(pembelian, "uang");
    const totalPengeluaran = sum(pengeluaran, "uang");

    const saldoToko = totalPenjualan - totalPembelian - totalPengeluaran;

    // ===== HITUNG STOK =====
    const stokMap = {};

    pembelian.forEach(item => {
      if (!stokMap[item.jenis]) {
        stokMap[item.jenis] = {
          stok: 0,
          hargaJual: item.hargaJual || 0
        };
      }

      stokMap[item.jenis].stok += Number(item.berat || 0);
    });

    penjualan.forEach(item => {
      if (stokMap[item.jenis]) {
        stokMap[item.jenis].stok -= Number(item.berat || 0);
      }
    });

    // ===== TOTAL STOK & POTENSI =====
    let totalStok = 0;
    let totalPotensiJual = 0;

    const listStok = [];

    for (let jenis in stokMap) {
      const item = stokMap[jenis];

      if (item.stok < 0) item.stok = 0;

      const potensi = item.stok * item.hargaJual;

      totalStok += item.stok;
      totalPotensiJual += potensi;

      listStok.push({
        jenis,
        stok: item.stok,
        potensi
      });
    }

    const totalAset = saldoToko + totalPotensiJual;

    // ===== TAMPIL KE UI =====
    document.getElementById("saldoToko").textContent = rupiah(saldoToko);
    document.getElementById("totalStok").textContent = totalStok.toFixed(2) + " kg";
    document.getElementById("totalPotensiJual").textContent = rupiah(totalPotensiJual);
    document.getElementById("totalAset").textContent = rupiah(totalAset);

    // ===== LIST STOK =====
    const ul = document.getElementById("daftarStok");
    ul.innerHTML = "";

    listStok.forEach(item => {
      const li = document.createElement("li");

      li.textContent = `${item.jenis} - ${item.stok.toFixed(2)} kg`;

      ul.appendChild(li);
    });

  } catch (err) {
    console.error("Aset error:", err);
  }
}

// ===== RUN =====
hitungAset();