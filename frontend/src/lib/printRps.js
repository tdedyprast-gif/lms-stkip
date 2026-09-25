function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl(value) {
  const text = String(value ?? "").trim();
  if (!text) return "&nbsp;";
  return esc(text).replace(/\n/g, "<br/>");
}

function academicYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 8) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

function semesterLabel(semester, date = new Date()) {
  const month = date.getMonth() + 1;
  const parity = month >= 8 && month <= 12 ? "GANJIL" : "GENAP";
  return `SEMESTER ${parity}${semester ? ` (${semester})` : ""}<br/>TAHUN AKADEMIK ${academicYear(date)}`;
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function lines(value) {
  return String(value || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function weekRows(meetings, cpmks, assessments) {
  const byWeek = new Map();
  (meetings || []).forEach((m) => byWeek.set(Number(m.week), m));
  const subs = (cpmks || []).flatMap((c) => c.sub_cpmks || []);
  const subByWeek = new Map();
  subs.forEach((s) => {
    const list = subByWeek.get(Number(s.week)) || [];
    list.push(s);
    subByWeek.set(Number(s.week), list);
  });
  const assessByWeek = new Map();
  (assessments || []).forEach((a) => {
    if (!a.week) return;
    const list = assessByWeek.get(Number(a.week)) || [];
    list.push(a);
    assessByWeek.set(Number(a.week), list);
  });

  return Array.from({ length: 16 }, (_, i) => {
    const week = i + 1;
    const meeting = byWeek.get(week);
    const weekSubs = subByWeek.get(week) || [];
    const weekAssess = assessByWeek.get(week) || [];
    const subText = weekSubs.map((s) => `${s.code ? `${s.code}: ` : ""}${s.description}`).join("\n");
    const assessText = weekAssess.map((a) => `${a.title}${a.weight ? ` (${a.weight}%)` : ""}`).join("\n");
    const weight = weekAssess.reduce((sum, a) => sum + Number(a.weight || 0), 0);
    return {
      week,
      sub: subText || meeting?.topic || "",
      indicator: meeting?.topic || subText,
      criteria: assessText,
      offline: meeting?.description || "",
      online: "",
      material: meeting?.topic || "",
      weight: weight ? `${weight}%` : "",
    };
  });
}

function evalRows(assessments) {
  const groups = new Map();
  (assessments || []).forEach((a) => {
    const key = a.title || a.type || "Penilaian";
    groups.set(key, (groups.get(key) || 0) + Number(a.weight || 0));
  });
  const rows = [...groups.entries()].map(([name, weight], i) => ({
    no: `${i + 1}.`,
    name,
    weight: weight ? `${weight}%` : "",
  }));
  const total = [...groups.values()].reduce((s, n) => s + n, 0);
  return { rows, total: total ? `${total}%` : "" };
}

export function buildRpsHtml({ course, rps, cpmks, meetings, assessments }) {
  const today = new Date();
  const prodiName = course?.prodi?.name || "PROGRAM STUDI PENDIDIKAN INFORMATIKA";
  const cplItems = [];
  const seen = new Set();
  (cpmks || []).forEach((cm) => {
    (cm.cpl_links || []).forEach((link) => {
      const code = link.cpl?.code;
      if (!code || seen.has(code)) return;
      seen.add(code);
      cplItems.push({ code, description: link.cpl?.description || "", domain: link.cpl?.domain || "" });
    });
  });

  const cpmkText = (cpmks || [])
    .map((cm, i) => `${i + 1}. ${cm.code ? `${cm.code} — ` : ""}${cm.description}`)
    .join("\n");
  const subText = (cpmks || [])
    .flatMap((cm) => cm.sub_cpmks || [])
    .map((s, i) => `Sub-CPMK${i + 1}${s.code ? ` (${s.code})` : ""}: ${s.description}`)
    .join("\n");

  const weeks = weekRows(meetings, cpmks, assessments);
  const evaluation = evalRows(assessments);
  const lecturer = course?.lecturer?.name || "";

  const weekHtml = weeks.map((w) => `
    <tr>
      <td class="c">${w.week}</td>
      <td>${nl(w.sub)}</td>
      <td>${nl(w.indicator)}</td>
      <td>${nl(w.criteria)}</td>
      <td>${nl(w.offline)}</td>
      <td>${nl(w.online)}</td>
      <td>${nl(w.material)}</td>
      <td class="c">${esc(w.weight) || "&nbsp;"}</td>
    </tr>`).join("");

  const evalHtml = evaluation.rows.length
    ? evaluation.rows.map((r) => `
      <tr>
        <td class="c">${esc(r.no)}</td>
        <td>${esc(r.name)}</td>
        <td class="c">${esc(r.weight)}</td>
      </tr>`).join("")
    : `<tr><td class="c">1.</td><td>&nbsp;</td><td class="c">&nbsp;</td></tr>`;

  const cplCodes = cplItems.map((c) => c.code).join("\n") || lines(rps?.capaian).slice(0, 8).join("\n");
  const cplRumusan = cplItems.map((c) => `${c.code}. ${c.description}`).join("\n") || rps?.capaian || "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>RPS ${esc(course?.code || "")} ${esc(course?.name || "")}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; font-family: "Times New Roman", Times, serif; font-size: 10px; }
    h1 { font-size: 13px; margin: 0; letter-spacing: 0.2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    td, th { border: 1px solid #222; padding: 3px 4px; vertical-align: top; }
    .center { text-align: center; }
    .c { text-align: center; vertical-align: middle; }
    .bold { font-weight: 700; }
    .title { font-size: 12px; font-weight: 700; text-align: center; line-height: 1.25; }
    .meta { font-size: 10px; font-weight: 700; text-align: center; }
    .label { font-weight: 700; width: 92px; background: #f4f4f4; }
    .head { background: #efefef; font-weight: 700; text-align: center; vertical-align: middle; }
    .small { font-size: 9px; }
    .sign { height: 42px; }
    .section { page-break-inside: avoid; }
    .week td { font-size: 8.5px; }
    .foot { margin-top: 6px; font-size: 8px; color: #444; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td class="title" colspan="4">
        RENCANA PEMBELAJARAN SEMESTER<br/>
        ${esc(prodiName.toUpperCase())}<br/>
        STKIP PGRI PACITAN
      </td>
      <td class="meta" colspan="2">${semesterLabel(course?.semester, today)}</td>
    </tr>
    <tr>
      <td class="label">MATA KULIAH</td>
      <td class="bold">${esc(course?.name)}</td>
      <td class="label">KODE</td>
      <td>${esc(course?.code)}</td>
      <td class="label">Rumpun MK</td>
      <td>${nl(rps?.rumpun || "Mata Kuliah Prodi (MK Prodi)")}</td>
    </tr>
    <tr>
      <td class="label">BOBOT (sks)</td>
      <td class="c bold">${esc(course?.sks ?? "")}</td>
      <td class="label">Semester</td>
      <td class="c">${esc(course?.semester ?? "")}</td>
      <td class="label">Tanggal penyusunan</td>
      <td>${esc(rps?.tanggal || formatDate(today))}</td>
    </tr>
  </table>

  <table class="section">
    <tr>
      <td class="head" rowspan="2" style="width:90px">OTORISASI</td>
      <td class="head">Pengembang RPS</td>
      <td class="head">Koordinator MK</td>
      <td class="head">Ka PRODI</td>
    </tr>
    <tr>
      <td class="center sign">${esc(rps?.pengembang || lecturer)}</td>
      <td class="center sign">${esc(rps?.koordinator || lecturer)}</td>
      <td class="center sign">${esc(rps?.kaprodi || "")}</td>
    </tr>
    <tr>
      <td class="head" rowspan="2">CP Lulusan</td>
      <td class="head">No CP Lulusan</td>
      <td class="head" colspan="2">Rumusan CP Lulusan</td>
    </tr>
    <tr>
      <td>${nl(cplCodes || "Lihat di kurikulum")}</td>
      <td colspan="2">${nl(cplRumusan)}</td>
    </tr>
    <tr>
      <td class="head" rowspan="2">CP Matakuliah</td>
      <td class="head">No CP MK</td>
      <td class="head" colspan="2">Rumusan CP MK</td>
    </tr>
    <tr>
      <td>${nl((cpmks || []).map((c) => c.code).join("\n"))}</td>
      <td colspan="2">${nl(cpmkText || rps?.capaian)}</td>
    </tr>
    <tr>
      <td class="bold">Capaian Pembelajaran (CP)</td>
      <td colspan="3"><b>Capaian Pembelajaran Mata Kuliah (CPMK)</b><br/>${nl(cpmkText || rps?.capaian)}</td>
    </tr>
    <tr>
      <td class="bold">Kemampuan akhir tiap tahapan belajar (Sub-CPMK)</td>
      <td colspan="3">${nl(subText)}</td>
    </tr>
    <tr>
      <td class="bold">Deskripsi Singkat MK</td>
      <td colspan="3">${nl(rps?.deskripsi || course?.description)}</td>
    </tr>
    <tr>
      <td class="bold">Pustaka</td>
      <td colspan="3">${nl(rps?.pustaka)}</td>
    </tr>
    <tr>
      <td class="bold">Bahan Kajian</td>
      <td colspan="3">${nl(rps?.bahan_kajian)}</td>
    </tr>
    <tr>
      <td class="bold">Metode Pembelajaran</td>
      <td colspan="3">${nl(rps?.metode)}</td>
    </tr>
  </table>

  <table class="week">
    <thead>
      <tr>
        <th class="head" rowspan="2" style="width:36px">Mg Ke-</th>
        <th class="head" rowspan="2">Kemampuan akhir tiap tahapan belajar (Sub-CPMK)</th>
        <th class="head" colspan="2">Penilaian</th>
        <th class="head" colspan="2">Bentuk Pembelajaran, Metode Pembelajaran, Penugasan Mahasiswa, [Estimasi Waktu]</th>
        <th class="head" rowspan="2">Materi Pembelajaran [Pustaka]</th>
        <th class="head" rowspan="2" style="width:52px">Bobot Penilaian (%)</th>
      </tr>
      <tr>
        <th class="head">Indikator</th>
        <th class="head">Kriteria &amp; Bentuk</th>
        <th class="head">Luring (offline)</th>
        <th class="head">Daring (online)</th>
      </tr>
      <tr>
        <th class="head">(1)</th><th class="head">(2)</th><th class="head">(3)</th><th class="head">(4)</th>
        <th class="head">(5)</th><th class="head">(6)</th><th class="head">(7)</th><th class="head">(8)</th>
      </tr>
    </thead>
    <tbody>${weekHtml}</tbody>
  </table>

  <table style="width:420px">
    <tr>
      <th class="head" style="width:40px">No</th>
      <th class="head">Evaluasi</th>
      <th class="head" style="width:90px">Persentase</th>
    </tr>
    ${evalHtml}
    <tr>
      <td colspan="2" class="bold c">Jumlah</td>
      <td class="c bold">${esc(evaluation.total) || "&nbsp;"}</td>
    </tr>
  </table>
  <p class="foot">Dicetak dari OBE-LMS STKIP PGRI Pacitan · ${esc(formatDate(today))} · Format mengikuti RPS Evaluasi Pembelajaran.</p>
</body>
</html>`;
}

export function printRps(payload) {
  const html = buildRpsHtml(payload);
  const frame = document.createElement("iframe");
  frame.setAttribute("title", "Cetak RPS");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  const win = frame.contentWindow;
  const cleanup = () => setTimeout(() => frame.remove(), 400);
  win.onafterprint = cleanup;
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 1500);
  }, 250);
}
