import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function rupiah(num) {
  return "Rp " + Number(num || 0).toLocaleString("id-ID");
}

// ambil total aman (anti string & anti NaN)
async function getTotal(namaCollection) {
  const snapshot = await getDocs(collection(db, namaCollection));

  let total = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const uang = Number(data.uang);

    if (!isNaN(uang)) {
      total += uang;
    }
  });

  return total;
}

async function hitungSaldo() {
  try {
    const [penjualan, pembelian, pengeluaran] = await Promise.all([
      getTotal("penjualanIkan"),
      getTotal("pembelianIkan"),
      getTotal("pengeluaran")
    ]);

    const saldo = penjualan - pembelian - pengeluaran;

    document.getElementById("totalPenjualan").textContent = rupiah(penjualan);
    document.getElementById("totalPembelian").textContent = rupiah(pembelian);
    document.getElementById("totalPengeluaran").textContent = rupiah(pengeluaran);
    document.getElementById("saldoToko").textContent = rupiah(saldo);

    const now = new Date();
    document.getElementById("tanggalUpdate").textContent =
      String(now.getDate()).padStart(2, "0") +
      "/" +
      String(now.getMonth() + 1).padStart(2, "0");

  } catch (err) {
    console.error("Saldo error:", err);
  }
}

hitungSaldo();