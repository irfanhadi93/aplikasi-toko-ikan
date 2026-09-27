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

// ===== 30 HARI TERAKHIR =====
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

// ===== AMBIL DATA FIRESTORE =====
async function getData(col) {
  const snap = await getDocs(collection(db, col));
  const data = [];

  snap.forEach(doc => {
    data.push(doc.data());
  });

  return data;
}

// ===== GROUP BY TANGGAL =====
function mapByDate(data) {
  const map = {};

  data.forEach(item => {
    const tgl = item.tanggal;
    const uang = Number(item.uang || 0);

    if (!map[tgl]) map[tgl] = 0;
    map[tgl] += uang;
  });

  return map;
}

// ===== MAIN =====
async function renderGrafik() {
  const penjualan = await getData("penjualanIkan");
  const pembelian = await getData("pembelianIkan");
  const pengeluaran = await getData("pengeluaran");

  const jualMap = mapByDate(penjualan);
  const beliMap = mapByDate(pembelian);
  const keluarMap = mapByDate(pengeluaran);

  const labels = getLast30Days();

  const dataJual = labels.map(t => jualMap[t] || 0);
  const dataBeli = labels.map(t => beliMap[t] || 0);
  const dataKeluar = labels.map(t => keluarMap[t] || 0);

  const ctx = document.getElementById("grafikSemua").getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Penjualan",
          data: dataJual,
          borderColor: "green",
          backgroundColor: "green",
          pointRadius: 4,
          tension: 0.3
        },
        {
          label: "Pembelian",
          data: dataBeli,
          borderColor: "blue",
          backgroundColor: "blue",
          pointRadius: 4,
          tension: 0.3
        },
        {
          label: "Pengeluaran",
          data: dataKeluar,
          borderColor: "red",
          backgroundColor: "red",
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

        // ===== INI YANG BUAT NOMINAL DI DOT =====
        datalabels: {
          color: (context) => context.dataset.borderColor, // warna ikut line
          anchor: "end",
          align: "top",
          font: {
            size: 10,
            weight: "bold"
          },
          formatter: (value) => {
            if (value === 0) return "";
            return "Rp " + value.toLocaleString("id-ID");
          }
        },

        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: Rp ${ctx.raw.toLocaleString("id-ID")}`
          }
        }
      },

      scales: {
        y: {
          beginAtZero: true
        }
      }
    },

    // ===== WAJIB AKTIFKAN PLUGIN =====
    plugins: [ChartDataLabels]
  });
}

// ===== RUN =====
renderGrafik();