// ===== FIREBASE =====
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===== FORMAT TANGGAL =====
function formatTanggal(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

// ===== 30 HARI =====
function getLast30Days() {
  const arr = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    arr.push(formatTanggal(d));
  }

  return arr;
}

// ===== AMBIL DATA =====
async function getData(col) {
  const snap = await getDocs(collection(db, col));

  const data = [];
  snap.forEach(doc => data.push(doc.data()));

  return data;
}

// ===== GROUP STOK PER HARI PER IKAN =====
function groupStock(data, type = "beli") {
  const map = {};

  data.forEach(item => {
    const tgl = item.tanggal;
    const jenis = item.jenis;
    const berat = Number(item.berat || 0);

    const key = `${tgl}-${jenis}`;

    if (!map[key]) map[key] = 0;

    if (type === "beli") {
      map[key] += berat;
    } else {
      map[key] -= berat;
    }
  });

  return map;
}

// ===== MAIN =====
async function renderGrafikStok() {
  const pembelian = await getData("pembelianIkan");
  const penjualan = await getData("penjualanIkan");

  const labels = getLast30Days();

  const beliMap = groupStock(pembelian, "beli");
  const jualMap = groupStock(penjualan, "jual");

  // ===== TOTAL NET STOK HARIAN =====
  const dataStok = labels.map(tgl => {
    let totalBeli = 0;
    let totalJual = 0;

    for (let key in beliMap) {
      if (key.startsWith(tgl)) totalBeli += beliMap[key];
    }

    for (let key in jualMap) {
      if (key.startsWith(tgl)) totalJual += jualMap[key];
    }

    return totalBeli + totalJual; // jual sudah negatif
  });

  const ctx = document.getElementById("grafikStok").getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Stok Harian (kg)",
          data: dataStok,
          borderColor: "orange",
          backgroundColor: "orange",
          pointRadius: 4,
          tension: 0.3
        }
      ]
    },

    options: {
      responsive: true,

      plugins: {
        legend: {
          position: "top"
        },

        // ===== NOMINAL DI DOT =====
        datalabels: {
          color: "orange",
          anchor: "end",
          align: "top",
          font: {
            size: 10,
            weight: "bold"
          },
          formatter: (value) => {
            if (value === 0) return "";
            return value.toFixed(2) + " kg";
          }
        },

        tooltip: {
          callbacks: {
            label: (ctx) =>
              `Stok: ${ctx.raw.toFixed(2)} kg`
          }
        }
      },

      scales: {
        y: {
          beginAtZero: true
        }
      }
    },

    plugins: [ChartDataLabels]
  });
}

// ===== RUN =====
renderGrafikStok();