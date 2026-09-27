const getData = () =>
  JSON.parse(localStorage.getItem("penjualanIkan")) || [];

const rupiah = (n) =>
  "Rp " + Number(n || 0).toLocaleString("id-ID");

function init() {
  const data = getData();

  let total = 0;
  let hari = new Set();

  let belut = { rp: 0, kg: 0 };
  let gabus = { rp: 0, kg: 0 };

  data.forEach(d => {
    const uang = +d.uang || 0;
    const kg = +d.berat || 0;
    const jenis = (d.jenis || "").toLowerCase();

    total += uang;
    if (d.tanggal) hari.add(d.tanggal);

    if (jenis.includes("belut")) {
      belut.rp += uang;
      belut.kg += kg;
    }

    if (jenis.includes("gabus")) {
      gabus.rp += uang;
      gabus.kg += kg;
    }
  });

  const hariTotal = Math.max(hari.size, 1);

  // ===== helper kecil =====
  const avg = (v) => v / hariTotal;

  // ===== RATA-RATA =====
  const rataRp = avg(total);
  const rataKg = avg(belut.kg + gabus.kg);

  const rataBelutRp = avg(belut.rp);
  const rataGabusRp = avg(gabus.rp);

  const rataBelutKg = avg(belut.kg);
  const rataGabusKg = avg(gabus.kg);

  // ===== helper render =====
  const set = (id, val) =>
    (document.getElementById(id).textContent = val);

  // ===== TOTAL =====
  set("totalPenjualan", rupiah(total));

  set("totalPenjualanBelutRp", rupiah(belut.rp));
  set("totalPenjualanBelutKg", belut.kg.toFixed(2) + " Kg");

  set("totalPenjualanGabusRp", rupiah(gabus.rp));
  set("totalPenjualanGabusKg", gabus.kg.toFixed(2) + " Kg");

  // ===== RATA-RATA =====
  set("rata-rataPenjualanRp", rupiah(rataRp) + "/hari");
  set("rata-rataPenjualanKg", rataKg.toFixed(2) + " Kg/hari");

  set("rata-rataPenjualanBelutRp", rupiah(rataBelutRp) + "/hari");
  set("rata-rataPenjualanGabusRp", rupiah(rataGabusRp) + "/hari");

  set("rata-rataPenjualanBelutKg", rataBelutKg.toFixed(2) + " Kg/hari");
  set("rata-rataPenjualanGabusKg", rataGabusKg.toFixed(2) + " Kg/hari");

  // ===== RIWAYAT (dibatasi biar gak panjang) =====
  const ul = document.getElementById("riwayatPenjualan");
  ul.innerHTML = "";

  data
    .slice(-10) // 🔥 cuma 10 terakhir
    .reverse()
    .forEach(d => {
      ul.innerHTML += `
        <li>
          ${d.tanggal} | ${d.jenis} - ${rupiah(d.uang)}
          (${(+d.berat || 0).toFixed(2)} Kg)
        </li>
      `;
    });
}

init();