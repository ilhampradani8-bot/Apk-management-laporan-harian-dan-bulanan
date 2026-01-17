let db = JSON.parse(localStorage.getItem('egg_db')) || [];
let stok_db = JSON.parse(localStorage.getItem('egg_stok_db')) || []; // Database stok produk
let profil = JSON.parse(localStorage.getItem('egg_profil')) || { nama: "TELUR BAROKAH", saldoAwal: 3373900 };

// Navigasi

function switchPage(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(id);
    if(targetPage) targetPage.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
    if(el) el.classList.add('active');

    // Masukkan ke history browser untuk tombol Back HP
    history.pushState({pageId: id}, "", "#" + id);

    // Refresh data spesifik tiap kali halaman dibuka
    if(id === 'page-input' || id === 'page-stok') renderStokLengkap();
    if(id === 'page-harian') renderHarian();
    if(id === 'page-bulanan') renderBulanan();
}

// Inisialisasi Settings

function loadProfil() {
    // Update Header
    const hNama = document.getElementById('header-nama');
    const hWa = document.getElementById('header-wa');
    if(hNama) hNama.innerText = profil.nama;
    if(hWa) hWa.innerText = profil.wa || '';

    // Update Form Settings (Cek dulu ada elemennya atau tidak)
    const sNama = document.getElementById('set-nama');
    const sAlamat = document.getElementById('set-alamat');
    const sWa = document.getElementById('set-wa');
    const sSaldo = document.getElementById('set-saldo-awal');

    if(sNama) sNama.value = profil.nama;
    if(sAlamat && profil.alamat) sAlamat.value = profil.alamat;
    if(sWa && profil.wa) sWa.value = profil.wa;
    if(sSaldo) sSaldo.value = profil.saldoAwal;
}

function simpanProfil() {
    profil.nama = document.getElementById('set-nama').value;
    profil.alamat = document.getElementById('set-alamat').value;
    profil.wa = document.getElementById('set-wa').value;
    profil.saldoAwal = Number(document.getElementById('set-saldo-awal').value);
    localStorage.setItem('egg_profil', JSON.stringify(profil));
    alert("Profil Diperbarui!");
    location.reload();
}

// Simpan Transaksi

// Logika Tombol Jual di Halaman Kasir
// GANTI BLOK TOMBOL JUAL INI:
document.getElementById('btnSimpanJual').addEventListener('click', () => {
    const tgl = document.getElementById('tgl').value;
    const produkNama = document.getElementById('pilih-produk').value;
    const qtyJual = Number(document.getElementById('jual_qty').value);
    const hJual = Number(document.getElementById('harga_jual').value);
    const checkboxPiutang = document.getElementById('is-piutang');
    const isPiutang = checkboxPiutang ? checkboxPiutang.checked : false;

    // 1. Validasi Modern (Ganti Alert)
    if(!tgl || !produkNama || qtyJual <= 0) {
        return openModal("Data Belum Lengkap", "Harap isi Tanggal, Produk, dan Jumlah dengan benar.");
    }

    // 2. Cek Stok
    let index = stok_db.findIndex(s => s.produk === produkNama);
    if(index === -1 || stok_db[index].qty < qtyJual) {
        return openModal("Stok Kurang", `Stok <b>${produkNama}</b> saat ini tidak mencukupi untuk penjualan ini.`);
    }

    // 3. Konfirmasi Sebelum Simpan (Fitur Baru)
    openModal("Konfirmasi Penjualan", 
        `Jual <b>${qtyJual}kg ${produkNama}</b> seharga <b>Rp${hJual.toLocaleString()}</b>?<br>Total: <b>Rp${(qtyJual*hJual).toLocaleString()}</b>`, 
        () => {
            // Aksi Simpan (Dijalankan jika klik "Lanjutkan")
            stok_db[index].qty -= qtyJual;
            db.push({
                tgl: tgl, beli_nama: '-', beli_qty: 0, uang_keluar: 0,
                jual_nama: document.getElementById('jual_nama').value || 'Umum',
                jual_qty: qtyJual, harga_jual: hJual, produk_terjual: produkNama, piutang: isPiutang
            });

            localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
            localStorage.setItem('egg_db', JSON.stringify(db));

            // Tampilkan Indikator Loading
            showProgress("Menyimpan Transaksi...");
            
            setTimeout(() => {
                renderHarian();
                switchPage('page-harian', document.querySelectorAll('.nav-btn')[3]);
            }, 1000); // Jeda sedikit biar terlihat keren
        }
    );
});



// Render Tabel Persis Excel

// 1. Fungsi Render Harian dengan Bulan Real-time

function renderHarian() {
    const body = document.getElementById('bodyHarian');
    const panelSaldo = document.getElementById('sticky-saldo');
    const txtSaldo = document.getElementById('txt-saldo-akhir');
    const fMulai = document.getElementById('filter-tgl-mulai').value;
    const fAkhir = document.getElementById('filter-tgl-akhir').value;
    const fBarang = document.getElementById('filter-barang').value;

    if (!body) return;

    // --- 1. Hitung Saldo Awal Cerdas ---
    let saldoAwalShow = profil.saldoAwal;
    let labelMutasi = "Saldo Awal";
    let akumulasiLalu = 0; // Pastikan variabel ini ada

    if (fMulai) {
        const d = new Date(fMulai);
        const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        labelMutasi = `Saldo per ${d.getDate()} ${namaBulan[d.getMonth()]}`;

        db.forEach(item => {
            if (item.tgl < fMulai) {
                const um = item.jual_qty * item.harga_jual;
                akumulasiLalu += (um - item.uang_keluar);
            }
        });
        saldoAwalShow += akumulasiLalu;
    }

    // --- 2. Render Baris Pertama (Header Saldo) ---
    body.innerHTML = `
        <tr onclick="kelolaSaldo()" style="cursor:pointer; background:#f9f9f9; border-bottom:2px solid #ddd;">
            <td style="font-weight:bold; color:#444;">${labelMutasi}</td>
            <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
            <td>-</td> 
            <td>-</td><td>-</td>
            <td style="font-weight:bold; color:blue;">Rp${saldoAwalShow.toLocaleString()}</td>
            <td>-</td><td>-</td>
        </tr>
    `;

    let runningStok = 0;
    let runningSaldo = saldoAwalShow;
    let totalJualKg = 0;
    let counter = 0;

    // --- 3. Render Data Transaksi ---
    const sortedDb = [...db].sort((a, b) => new Date(a.tgl) - new Date(b.tgl));

    sortedDb.forEach((item) => {
        const uangMasuk = item.jual_qty * item.harga_jual;
        const profit = uangMasuk - item.uang_keluar;
        const originalIndex = db.indexOf(item); 

        // Logika Filter
        let passing = true;
        if (fMulai && item.tgl < fMulai) passing = false;
        if (fAkhir && item.tgl > fAkhir) passing = false;
        if (fBarang) {
            const bBeli = (item.beli_nama || "").toLowerCase();
            const bJual = (item.produk_terjual || "").toLowerCase();
            const filter = fBarang.toLowerCase();
            if (bBeli !== filter && bJual !== filter) passing = false;
        }

        if (passing) {
             runningStok = (runningStok + item.beli_qty) - item.jual_qty;
             runningSaldo = (runningSaldo + uangMasuk) - item.uang_keluar;
             totalJualKg += item.jual_qty;
             counter++;

             // Logika Piutang
             const classPiutang = item.piutang ? 'bg-yellow' : '';
             const clickPiutang = item.piutang ? `onclick="bayarUtang(${originalIndex}, event)"` : '';
             const cursorStyle = item.piutang ? 'cursor:pointer' : '';

             // RENDER BARIS (Perhatikan backtick ` di awal dan akhir blok ini)
             body.innerHTML += `
                <tr onclick="hapusTransaksi(${originalIndex})" style="cursor:pointer; transition:0.2s;">
                    <td>${item.tgl}</td>
                    <td>${item.beli_nama || '-'}</td><td>${item.beli_qty || '-'}</td>
                    <td>${item.jual_nama || '-'}</td><td>${item.jual_qty || '0'}</td>
                    <td>${runningStok}</td>
                    
                    <td class="${classPiutang}" ${clickPiutang} style="${cursorStyle}" title="${item.piutang ? 'Klik untuk LUNAS' : ''}">
                        ${item.harga_jual > 0 ? 'Rp' + item.harga_jual.toLocaleString() : '-'}
                    </td>
                    
                    <td>Rp${uangMasuk.toLocaleString()}</td>
                    <td>Rp${item.uang_keluar.toLocaleString()}</td>
                    <td class="${runningSaldo < 0 ? 'text-red' : ''}" style="font-weight:bold;">Rp${runningSaldo.toLocaleString()}</td>
                    <td class="${profit < 0 ? 'text-red' : ''}">${profit !== 0 ? 'Rp' + profit.toLocaleString() : '-'}</td>
                    <td>${(totalJualKg / counter || 0).toFixed(2)} kg</td>
                </tr>`;
        }
    });

    if(panelSaldo && txtSaldo) {
        txtSaldo.innerText = `Rp${runningSaldo.toLocaleString()}`;
        panelSaldo.style.display = 'flex';
    }
}



// 2. Fungsi Render Bulanan (Restored)
function renderBulanan() {
    const body = document.getElementById('bodyBulanan');
    const foot = document.getElementById('footerBulanan');
    const fTahun = document.getElementById('filter-tahun').value;
    if(!body) return;

    body.innerHTML = '';
    const rekap = {};
    const blns = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    blns.forEach(b => rekap[b] = { m: 0, k: 0, uM: 0, uK: 0 });

    db.forEach(item => {
        const d = new Date(item.tgl);
        if(d.getFullYear().toString() === fTahun) {
            const bName = blns[d.getMonth()];
            rekap[bName].m += item.beli_qty;
            rekap[bName].k += item.jual_qty;
            rekap[bName].uM += (item.jual_qty * item.harga_jual);
            rekap[bName].uK += item.uang_keluar;
        }
    });

    let gTotal = { m: 0, k: 0, uM: 0, uK: 0 };
    blns.forEach(b => {
        const diff = rekap[b].m - rekap[b].k;
        const untung = rekap[b].uM - rekap[b].uK;
        gTotal.m += rekap[b].m; gTotal.k += rekap[b].k;
        gTotal.uM += rekap[b].uM; gTotal.uK += rekap[b].uK;

        body.innerHTML += `
            <tr>
                <td style="text-align:left">${b}</td>
                <td>${rekap[b].m}</td><td>${rekap[b].k}</td><td>${diff}</td>
                <td>Rp${rekap[b].uM.toLocaleString()}</td>
                <td>Rp${rekap[b].uK.toLocaleString()}</td>
                <td class="${untung < 0 ? 'text-red' : ''}">Rp${untung.toLocaleString()}</td>
            </tr>`;
    });

    foot.innerHTML = `
        <td>TOTAL</td><td>${gTotal.m}</td><td>${gTotal.k}</td><td>${gTotal.m - gTotal.k}</td>
        <td>Rp${gTotal.uM.toLocaleString()}</td><td>Rp${gTotal.uK.toLocaleString()}</td>
        <td>Rp${(gTotal.uM - gTotal.uK).toLocaleString()}</td>`;
}





// Fungsi Export Gambar Full (Persegi Panjang)



// Fitur Interaktif: Klik bulan di Laporan, lari ke Harian
function filterKeHarian(bulanNama) {
    alert("Menampilkan detail harian untuk bulan " + bulanNama);
    switchPage('page-harian', document.querySelectorAll('.nav-btn')[1]);
}






function resetData() {
    if(confirm("AWAS: Ini akan menghapus seluruh catatan transaksi!")) {
        localStorage.removeItem('egg_db');
        location.reload();
    }
}

// Inisialisasi awal saat aplikasi dibuka
loadProfil();
renderStokLengkap(); 
renderHarian();



function tambahStokMasuk() {
    const tgl = document.getElementById('tgl_masuk').value;
    const prod = document.getElementById('produk_masuk').value;
    const qty = Number(document.getElementById('qty_masuk').value);
    const modalTotal = Number(document.getElementById('harga_modal').value);
    const hJual = Number(document.getElementById('harga_jual_set').value);

    if(!tgl || !prod || qty <= 0) {
        return openModal("Data Tidak Lengkap", "Mohon lengkapi Tanggal, Nama Produk, dan Jumlah (kg) pembelian.");
    }

    // Hitung modal per kg
    const modalPerKg = modalTotal / qty;

    // Simpan ke Riwayat Transaksi
    db.push({
        tgl: tgl, beli_nama: prod, beli_qty: qty, uang_keluar: modalTotal,
        jual_nama: '-', jual_qty: 0, harga_jual: 0
    });

    // Update Data Stok
    let idx = stok_db.findIndex(s => s.produk.toLowerCase() === prod.toLowerCase());
    if(idx > -1) {
        stok_db[idx].qty += qty;
        stok_db[idx].modal_per_kg = modalPerKg; // Update modal terbaru
        stok_db[idx].harga_jual = hJual;
    } else {
        stok_db.push({ 
            produk: prod, supplier: document.getElementById('supplier').value, 
            qty: qty, harga_jual: hJual, modal_per_kg: modalPerKg 
        });
    }

    localStorage.setItem('egg_db', JSON.stringify(db));
    localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
    
    showProgress("Stok Berhasil Ditambah!");
    // Reset form tanpa pindah halaman
    document.querySelectorAll('#page-masuk input').forEach(i => i.value = '');
    renderStokLengkap(); 
}





function renderStokLengkap() {
    const body = document.getElementById('bodyStok');
    const selectJual = document.getElementById('pilih-produk');
    const selectFilterHarian = document.getElementById('filter-barang'); // Target filter harian
    
    if (!body || !selectJual || !selectFilterHarian) return;

    body.innerHTML = '';
    // Reset dropdowns
    selectJual.innerHTML = '<option value="">-- Pilih Produk --</option>';
    selectFilterHarian.innerHTML = '<option value="">-- Semua Barang --</option>';

    let tQty = 0;
    stok_db.forEach((s, index) => {
        tQty += s.qty;
        body.innerHTML += `
            <tr>
                <td style="text-align:left"><b>${s.produk}</b></td>
                <td>${s.supplier}</td>
                <td>Rp${(s.modal_per_kg || 0).toLocaleString()}</td>
                <td class="bg-yellow">Rp${s.harga_jual.toLocaleString()}</td>
                <td style="font-weight:bold; color:${s.qty < 5 ? 'red' : 'green'}">${s.qty} kg</td>
                <td data-html2canvas-ignore>
                    <button onclick="editStok(${index})">✏️</button>
                    <button onclick="hapusStok(${index})">🗑️</button>
                </td>
            </tr>`;
        
        // Isi Dropdown Jual & Filter Harian
        const opt = `<option value="${s.produk}">${s.produk}</option>`;
        selectJual.innerHTML += opt;
        selectFilterHarian.innerHTML += opt;
    });

    const foot = document.getElementById('footStok');
    if(foot) foot.innerHTML = `<td colspan="4">TOTAL PRODUK: ${stok_db.length}</td><td colspan="2">TOTAL STOK: ${tQty} kg</td>`;
}

// --- Fungsi Master Pop-up ---
function openModal(title, content, onConfirm = null) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-content').innerHTML = content;
    const footer = document.getElementById('modal-footer');
    
    footer.innerHTML = `<button onclick="closeModal()" style="background:#eee; color:#333">Batal</button>`;
    if (onConfirm) {
        const btnOk = document.createElement('button');
        btnOk.innerText = "Lanjutkan";
        btnOk.className = "btn-primary"; // Gunakan warna emas kamu
        btnOk.onclick = () => { onConfirm(); closeModal(); };
        footer.appendChild(btnOk);
    }
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// --- Fungsi Indikator Progres ---
function showProgress(text, duration = 2000) {
    const toast = document.getElementById('progress-toast');
    document.getElementById('toast-text').innerText = text;
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// --- Contoh Penerapan pada Fitur Kamu ---

// 1. Pop-up Hapus Stok


// 2. Indikator Export Gambar/XLS

function exportExcel(id, name) {
    showProgress("Menyiapkan Excel...", 1500); // Muncul toast loading
    setTimeout(() => {
        const element = document.getElementById(id);
        const wb = XLSX.utils.table_to_book(element);
        XLSX.writeFile(wb, name + ".xlsx");
    }, 500);
}


function exportGambar(id, name) {
    showProgress("Merender Gambar...", 2000); 

    const element = document.getElementById(id);
    const originalWidth = element.scrollWidth;
    const originalHeight = element.scrollHeight;

    setTimeout(() => {
        html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: originalWidth,
            height: originalHeight,
            windowWidth: originalWidth,
            windowHeight: originalHeight,
            scrollX: 0,
            scrollY: -window.scrollY,
            onclone: (clonedDoc) => {
                const clonedEl = clonedDoc.getElementById(id);
                if(clonedEl) {
                    clonedEl.style.width = originalWidth + "px";
                    clonedEl.style.height = originalHeight + "px";
                    clonedEl.style.overflow = "visible"; 
                }
                clonedDoc.querySelectorAll('[data-html2canvas-ignore]').forEach(el => el.style.display = 'none');
            }
        }).then(canvas => {
            // --- TRIK KHUSUS APK ANDROID ---
            // Ubah tipe file jadi 'octet-stream' agar Android tidak mencoba membacanya sebagai teks
            const imgData = canvas.toDataURL("image/png", 1.0).replace("image/png", "application/octet-stream");
            
            const link = document.createElement('a');
            const timestamp = new Date().getTime();
            // Beri ekstensi .png secara manual di nama file
            link.download = `${name}_${timestamp}.png`;
            link.href = imgData;
            
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
            }, 1000);

            showProgress("✅ File Disimpan!");

        }).catch(err => {
            console.error(err);
            openModal("Gagal", "Error: " + err);
        });
    }, 100);
}



// 3. Edit Saldo Harian (Mengganti Prompt)
function editSaldoAwal() {
    const html = `<input type="number" id="input-saldo-baru" value="${profil.saldoAwal}" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; font-size:16px;">`;
    
    openModal("Ubah Saldo Awal", html, () => {
        const val = document.getElementById('input-saldo-baru').value;
        if(val) {
            profil.saldoAwal = Number(val);
            localStorage.setItem('egg_profil', JSON.stringify(profil));
            renderHarian();
            showProgress("Saldo Berhasil Diubah");
        }
    });
}



// Ganti fungsi hapusStok yang lama
function hapusStok(index) {
    // Pengganti confirm()
    openModal("Hapus Barang", 
        `Yakin ingin menghapus <b>${stok_db[index].produk}</b> dari database stok?`, 
        () => {
            stok_db.splice(index, 1);
            localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
            renderStokLengkap();
            showProgress("Data Dihapus");
        }
    );
}

// Ganti fungsi editStok yang lama
function editStok(index) {
    let s = stok_db[index];
    // Pengganti prompt() -> Kita buat form mini dalam modal
    const formHtml = `
        <label>Stok (kg):</label>
        <input type="number" id="edit-qty" class="modern-input" value="${s.qty}" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ddd; border-radius:5px;">
        <label>Harga Jual (Rp):</label>
        <input type="number" id="edit-harga" class="modern-input" value="${s.harga_jual}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:5px;">
    `;

    openModal(`Edit ${s.produk}`, formHtml, () => {
        const nQty = document.getElementById('edit-qty').value;
        const nHarga = document.getElementById('edit-harga').value;
        
        if(nQty !== '' && nHarga !== '') {
            stok_db[index].qty = Number(nQty);
            stok_db[index].harga_jual = Number(nHarga);
            localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
            renderStokLengkap();
            showProgress("Stok Diupdate!");
        }
    });
}


function updateYearFilter() {
    const select = document.getElementById('filter-tahun');
    if (!select) return;

    // Cari semua tahun yang ada di database
    let daftarTahun = [new Date().getFullYear()];
    db.forEach(item => {
        const thn = new Date(item.tgl).getFullYear();
        if(!daftarTahun.includes(thn)) daftarTahun.push(thn);
    });

    // Urutkan tahun dari yang terbaru
    daftarTahun.sort((a, b) => b - a);

    select.innerHTML = '';
    daftarTahun.forEach(thn => {
        select.innerHTML += `<option value="${thn}">${thn}</option>`;
    });
}
// Panggil fungsi ini di bagian paling bawah script.js bersama loadProfil

function switchPage(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
    el.classList.add('active');

    // Masukkan ke history browser agar tombol back HP jalan
    history.pushState({pageId: id}, "", "#" + id);

    if(id === 'page-harian') renderHarian();
    if(id === 'page-bulanan') renderBulanan();
    if(id === 'page-stok') renderStokLengkap();
}

// Event saat tombol BACK HP ditekan
window.onpopstate = function(event) {
    if (event.state && event.state.pageId) {
        const id = event.state.pageId;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        
        // Update menu nav bawah sesuai halaman
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if(btn.getAttribute('onclick').includes(id)) btn.classList.add('active');
        });
    }
};

function kelolaSaldo() {
    const html = `
        <label>Tanggal:</label>
        <input type="date" id="tgl-kelola-saldo" class="modern-input" style="width:100%; margin-bottom:10px;" value="${new Date().toISOString().split('T')[0]}">
        
        <label>Jenis Transaksi:</label>
        <div style="display:flex; gap:10px; margin-bottom:10px;">
            <label style="flex:1; cursor:pointer; background:#e8f5e9; padding:10px; border-radius:8px; text-align:center; border:1px solid #c8e6c9;">
                <input type="radio" name="jenis-saldo" value="tambah" checked> ➕ Tambah
            </label>
            <label style="flex:1; cursor:pointer; background:#ffebee; padding:10px; border-radius:8px; text-align:center; border:1px solid #ffcdd2;">
                <input type="radio" name="jenis-saldo" value="kurang"> ➖ Kurangi
            </label>
        </div>

        <label>Nominal (Rp):</label>
        <input type="number" id="input-kelola-nominal" class="modern-input" placeholder="0" style="width:100%;">
        <p style="font-size:11px; color:#666; margin-top:5px;">*Mengubah saldo kas tunai toko.</p>
    `;
    
    openModal("Kelola Saldo Kas", html, () => {
        const tgl = document.getElementById('tgl-kelola-saldo').value;
        const nominal = Number(document.getElementById('input-kelola-nominal').value);
        const jenis = document.querySelector('input[name="jenis-saldo"]:checked').value;
        
        if(nominal > 0 && tgl) {
            if(jenis === 'tambah') {
                profil.saldoAwal += nominal;
                catatLog(`💰 Tambah Saldo: Rp${nominal.toLocaleString()}`, tgl);
            } else {
                profil.saldoAwal -= nominal;
                catatLog(`💸 Tarik Saldo: -Rp${nominal.toLocaleString()}`, tgl);
            }

            localStorage.setItem('egg_profil', JSON.stringify(profil));
            renderHarian();
            showProgress("Saldo Kas Diperbarui!");
        } else {
            showProgress("Gagal. Isi nominal dengan benar.");
        }
    });
}

// Database Riwayat (Log)
let log_db = JSON.parse(localStorage.getItem('egg_log')) || [];

function catatLog(aktivitas, tanggal) {
    // Simpan log baru di paling atas
    log_db.unshift({ akt: aktivitas, tgl: tanggal, time: new Date().toLocaleTimeString() });
    // Batasi cuma simpan 50 riwayat terakhir biar ringan
    if(log_db.length > 50) log_db.pop();
    
    localStorage.setItem('egg_log', JSON.stringify(log_db));
    renderRiwayat(); // Update tampilan
}

function renderRiwayat() {
    const container = document.getElementById('list-riwayat');
    if(!container) return;
    
    container.innerHTML = '';
    if(log_db.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:12px;">Belum ada aktivitas.</p>';
        return;
    }

    log_db.forEach(log => {
        container.innerHTML += `
            <div style="border-bottom:1px solid #eee; padding: 10px 0; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold; font-size:13px; color:#333;">${log.akt}</div>
                    <div style="font-size:10px; color:#888;">${log.tgl} • ${log.time}</div>
                </div>
            </div>
        `;
    });
}

function bayarUtang(index, event) {
    if(event) event.stopPropagation(); // Mencegah pemicu hapus baris
    const item = db[index];
    const totalTagihan = item.jual_qty * item.harga_jual;
    
    // Tampilkan Modal Konfirmasi
    openModal("Pelunasan Piutang", 
        `Pembeli <b>${item.jual_nama}</b> akan melunasi tagihan sebesar:<br>
         <h2 style="color:green; text-align:center; margin:10px 0;">Rp${totalTagihan.toLocaleString()}</h2>
         <p>Tanggal Transaksi: ${item.tgl}</p>
         <p>Barang: ${item.produk_terjual} (${item.jual_qty}kg)</p>
         <br>Apakah tagihan ini sudah <b>LUNAS</b>?`,
        () => {
            // Aksi jika tombol "Lanjutkan" diklik
            db[index].piutang = false; // Hapus status piutang (warna kuning hilang)
            
            // Catat ke Riwayat Aktivitas
            catatLog(`✅ Piutang Lunas: ${item.jual_nama} (Rp${totalTagihan.toLocaleString()})`, new Date().toISOString().split('T')[0]);
            
            // Simpan & Refresh
            localStorage.setItem('egg_db', JSON.stringify(db));
            renderHarian(); 
            showProgress("Tagihan Lunas! Warna kuning dihapus.");
        }
    );
}

function hapusTransaksi(index) {
    const item = db[index];
    const info = item.beli_nama !== '-' ? 
                 `Pembelian: ${item.beli_nama} (${item.beli_qty}kg)` : 
                 `Penjualan: ${item.jual_nama} (${item.jual_qty}kg)`;

    openModal("Hapus Transaksi", 
        `Yakin ingin menghapus baris ini?<br><br>
         <b>${item.tgl}</b><br>${info}<br><br>
         <small style="color:red;">*Data yang dihapus tidak bisa dikembalikan.</small>`,
        () => {
            // Hapus dari database
            db.splice(index, 1);
            localStorage.setItem('egg_db', JSON.stringify(db));
            
            // Catat Log
            catatLog(`🗑️ Hapus Transaksi: ${item.tgl}`, new Date().toISOString().split('T')[0]);
            
            renderHarian();
            showProgress("Baris berhasil dihapus!");
        }
    );
}

function resetRiwayat() {
    openModal("Hapus Semua Riwayat", 
        "Apakah Anda yakin ingin menghapus <b>SEMUA</b> catatan aktivitas log sistem?<br>Data transaksi harian tidak akan terhapus.",
        () => {
            log_db = []; // Kosongkan array
            localStorage.removeItem('egg_log');
            renderRiwayat();
            showProgress("Riwayat Bersih!");
        }
    );
}

// Tambahkan catatLog() juga di fungsi JUAL (btnSimpanJual)
// Cari bagian db.push di btnSimpanJual dan tambahkan:
// catatLog(`🛒 Terjual: ${produkNama} ${qtyJual}kg`, tgl);

// Pastikan saat simpan JUAL tidak pindah halaman
// Cari listener btnSimpanJual dan hapus baris switchPage di akhir fungsinya

// Jalankan semua fungsi inisialisasi secara berurutan
function initApp() {
    loadProfil();
    updateYearFilter();
    renderStokLengkap(); // Mengisi dropdown produk
    renderHarian();
    renderBulanan();
    renderRiwayat(); // <--- Tambahkan ini
}

// Panggil fungsi inisialisasi
initApp();