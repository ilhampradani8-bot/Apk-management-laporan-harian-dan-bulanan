// ==========================================
// ☁️ KONFIGURASI SUPABASE (DATABASE AWAN)
// ==========================================
// Pastikan tidak ada kode 'const NGAN INDIKATOR PROSES) ---

// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const { createClient } = supabase;
const supaUrl = 'https://arcgcwsacncqeqvtiyir.supabase.co';
const supaKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyY2djd3NhY25jcWVxdnRpeWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzAzMjcsImV4cCI6MjA4MzY0NjMyN30.gvPJkIjOS6jD9FDh6Ge7-fxYbbfYH08Pcv4aSKL0FkQ';

// Tambahkan opsi auth agar tidak bentrok di localhost
const dbAwan = createClient(supaUrl, supaKey, {
    auth: { persistSession: false } 
});

// ==========================================
// 2. DATABASE LOKAL (KUMPULKAN DISINI SEMUA)
// ==========================================
let stok_db = JSON.parse(localStorage.getItem('egg_stok_db')) || [];
let profil = JSON.parse(localStorage.getItem('egg_profil')) || { nama: "TELUR BAROKAH", saldoAwal: 0 };
let log_db = JSON.parse(localStorage.getItem('egg_log')) || [];

// Database Sampah (Untuk Sync Hapus)
let deleted_ids = JSON.parse(localStorage.getItem('egg_deleted')) || [];
let deleted_stok = JSON.parse(localStorage.getItem('egg_deleted_stok')) || []; // <--- PASTI ADA DISINI

async function syncKeAwan() {
    // 1. Cek Koneksi Awal
    if (!navigator.onLine) {
        alert("❌ Tidak ada internet. Cek koneksi Data/WiFi.");
        return;
    }
    
    try {
        // TAHAP 1: MENGHUBUNGKAN
        showProgress("📡 Menghubungkan ke Server...", 5000); // Durasi lama biar gak hilang
        
        // Bungkus data
        const dataPaket = {
            transaksi: db,
            stok: stok_db,
            profil: profil,
            riwayat: log_db,
            tgl_sync: new Date().toLocaleString()
        };
        
        // TAHAP 2: MENGUNGGAH
        // Kita kasih jeda dikit biar tulisan terbaca
        setTimeout(() => showProgress("☁️ Mengunggah Data...", 5000), 500);
        
        // Proses kirim ke Supabase
        const { error } = await dbAwan
            .from('tb_telur_barokah')
            .upsert({ id: 1, content: dataPaket });
        
        if (error) throw error;
        
        // TAHAP 3: SUKSES
        showProgress("✅ Upload Berhasil!");
        
        // Opsional: Bunyi notifikasi kecil atau getar kalau di HP
        if (navigator.vibrate) navigator.vibrate(200);
        
    } catch (err) {
        showProgress("❌ Gagal!", 1000);
        setTimeout(() => {
            alert("Eror: " + err.message + "\n(Cek sinyal internet)");
        }, 500);
    }
}

// --- FUNGSI 2: DOWNLOAD (DENGAN INDIKATOR PROSES) ---
// --- FUNGSI 2: DOWNLOAD (DENGAN SMART MERGE / ANTI-DUPLIKAT) ---
async function tarikDariAwan() {
    if (!navigator.onLine) {
        alert("❌ Tidak ada internet.");
        return;
    }
    
    try {
        showProgress("📡 Menghubungkan ke Server...", 5000);
        
        // 1. Ambil data dari Server
        const { data, error } = await dbAwan
            .from('tb_telur_barokah')
            .select('content')
            .eq('id', 1)
            .single();
        
        if (error) throw error;
        
        showProgress("⬇️ Membandingkan Data...", 2000);
        
        if (data && data.content) {
            const server = data.content;
            const serverTrx = server.transaksi || [];
            
            openModal("Sinkronisasi Cerdas",
                `Data Server: <b>${server.tgl_sync || '-'}</b><br>
                 Jumlah: ${serverTrx.length} Transaksi.<br><br>
                 Aplikasi akan menggabungkan data baru dan membuang yang duplikat. Lanjutkan?`,
                () => {
                    // --- LOGIKA ANTI-DUPLIKAT (SMART MERGE) ---
                    let dataBaruMasuk = 0;
                    
                    // 1. Buat "Sidik Jari" untuk semua data yang ada di HP sekarang
                    // Sidik jari = Gabungan Tanggal + Nama Barang + Qty + Jam (biar unik)
                    const jejakHP = new Set(db.map(item =>
                        `${item.tgl}-${item.produk_terjual}-${item.jual_qty}-${item.uang_keluar}`
                    ));
                    
                    // 2. Cek Data Server satu per satu
                    serverTrx.forEach(itemServer => {
                        // Bikin sidik jari untuk item dari server
                        const sidikJari = `${itemServer.tgl}-${itemServer.produk_terjual}-${itemServer.jual_qty}-${itemServer.uang_keluar}`;
                        
                        // Cek: Kalau sidik jari ini BELUM ADA di HP, berarti ini data baru!
                        if (!jejakHP.has(sidikJari)) {
                            db.push(itemServer); // Masukkan ke database HP
                            dataBaruMasuk++;
                        }
                        // Kalau sudah ada (Has), otomatis di-skip (Anti-Duplikat)
                    });
                    
                    // 3. Update Stok & Profil (Timpa dengan yang terbaru dari server agar sinkron)
                    if (server.stok && server.stok.length > 0) stok_db = server.stok;
                    if (server.profil) profil = server.profil;
                    
                    // 4. Simpan Hasil Penggabungan
                    localStorage.setItem('egg_db', JSON.stringify(db));
                    localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
                    localStorage.setItem('egg_profil', JSON.stringify(profil));
                    
                    // Render Ulang
                    loadProfil();
                    renderHarian();
                    renderStokLengkap();
                    renderRiwayat();
                    
                    showProgress(`🚀 Sukses! ${dataBaruMasuk} Data Baru Ditambahkan.`);
                }
            );
        } else {
            alert("Data di server masih kosong.");
        }
    } catch (err) {
        showProgress("❌ Gagal!", 1000);
        setTimeout(() => { alert("Eror: " + err.message); }, 500);
    }
}

// ... DI BAWAH SINI ADALAH KODE LAMA KAMU (JANGAN DIHAPUS) ...
// let db = ...
// let stok_db = ...

let db = JSON.parse(localStorage.getItem('egg_db')) || [];
// Database stok produk

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



// Render Tabel Persis Excel

// 1. Fungsi Render Harian dengan Bulan Real-time

// --- UPDATE: RENDER HARIAN (ANTI CRASH / KEBAL EROR) ---
function renderHarian() {
    const body = document.getElementById('bodyHarian');
    const panelSaldo = document.getElementById('sticky-saldo');
    const txtSaldo = document.getElementById('txt-saldo-akhir');
    const fMulai = document.getElementById('filter-tgl-mulai').value;
    const fAkhir = document.getElementById('filter-tgl-akhir').value;
    const fBarang = document.getElementById('filter-barang').value;

    if (!body) return;
    
    // Bersihkan tabel dulu
    body.innerHTML = '';

    // --- 1. Hitung Saldo Awal Cerdas ---
    let saldoAwalShow = profil.saldoAwal || 0;
    let labelMutasi = "Saldo Awal";
    let akumulasiLalu = 0;

    if (fMulai) {
        const d = new Date(fMulai);
        const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        labelMutasi = `Saldo per ${d.getDate()} ${namaBulan[d.getMonth()]}`;

        db.forEach(item => {
            if (item.tgl < fMulai) {
                // Gunakan || 0 agar tidak eror jika data null
                const jQty = item.jual_qty || 0;
                const hJual = item.harga_jual || 0;
                const uKeluar = item.uang_keluar || 0;
                
                const um = jQty * hJual;
                akumulasiLalu += (um - uKeluar);
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
        // SAFETY FIRST: Pastikan semua angka ada nilainya (tidak null)
        const bQty = item.beli_qty || 0;
        const jQty = item.jual_qty || 0;
        const hJual = item.harga_jual || 0;
        const uKeluar = item.uang_keluar || 0;
        
        const uangMasuk = jQty * hJual;
        const profit = uangMasuk - uKeluar;
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
             runningStok = (runningStok + bQty) - jQty;
             runningSaldo = (runningSaldo + uangMasuk) - uKeluar;
             totalJualKg += jQty;
             counter++;

             const classPiutang = item.piutang ? 'bg-yellow' : '';
             const clickPiutang = item.piutang ? `onclick="bayarUtang(${originalIndex}, event)"` : '';
             const cursorStyle = item.piutang ? 'cursor:pointer' : '';

             // RENDER BARIS (Pakai || 0 di semua toLocaleString)
             body.innerHTML += `
                <tr onclick="hapusTransaksi(${originalIndex})" style="cursor:pointer; transition:0.2s;">
                    <td>${item.tgl}</td>
                    <td>${item.beli_nama || '-'}</td><td>${bQty || '-'}</td>
                    <td>${item.jual_nama || '-'}</td><td>${jQty || '0'}</td>
                    <td>${runningStok}</td>
                    
                    <td class="${classPiutang}" ${clickPiutang} style="${cursorStyle}" title="${item.piutang ? 'Klik untuk LUNAS' : ''}">
                        ${hJual > 0 ? 'Rp' + hJual.toLocaleString() : '-'}
                    </td>
                    
                    <td>Rp${uangMasuk.toLocaleString()}</td>
                    
                    <td>Rp${(uKeluar || 0).toLocaleString()}</td>
                    
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

// --- UPDATE: RENDER BULANAN (ANTI CRASH) ---
function renderBulanan() {
    const body = document.getElementById('bodyBulanan');
    const foot = document.getElementById('footerBulanan');
    const fTahun = document.getElementById('filter-tahun').value;
    if(!body) return;

    body.innerHTML = '';
    const rekap = {};
    const blns = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    
    // Inisialisasi awal
    blns.forEach(b => rekap[b] = { m: 0, k: 0, uM: 0, uK: 0 });

    db.forEach(item => {
        if (!item.tgl) return;
        const d = new Date(item.tgl);
        if(d.getFullYear().toString() === fTahun) {
            const bName = blns[d.getMonth()];
            
            // Gunakan || 0 untuk mencegah null
            const bQty = item.beli_qty || 0;
            const jQty = item.jual_qty || 0;
            const hJual = item.harga_jual || 0;
            const uKeluar = item.uang_keluar || 0;

            rekap[bName].m += bQty;
            rekap[bName].k += jQty;
            rekap[bName].uM += (jQty * hJual);
            rekap[bName].uK += uKeluar;
        }
    });

    let gTotal = { m: 0, k: 0, uM: 0, uK: 0 };
    blns.forEach(b => {
        const diff = rekap[b].m - rekap[b].k;
        const untung = rekap[b].uM - rekap[b].uK;
        
        gTotal.m += rekap[b].m; 
        gTotal.k += rekap[b].k;
        gTotal.uM += rekap[b].uM; 
        gTotal.uK += rekap[b].uK;

        body.innerHTML += `
            <tr>
                <td style="text-align:left; font-weight:bold;">${b}</td>
                <td>${rekap[b].m || 0}</td>
                <td>${rekap[b].k || 0}</td>
                <td>${diff || 0}</td>
                <td>Rp${(rekap[b].uM || 0).toLocaleString()}</td>
                <td>Rp${(rekap[b].uK || 0).toLocaleString()}</td>
                <td style="color:${untung < 0 ? 'red' : 'green'}; font-weight:bold;">
                    Rp${(untung || 0).toLocaleString()}
                </td>
            </tr>`;
    });

    if(foot) {
        foot.innerHTML = `
            <td style="font-weight:bold; background:#eee;">TOTAL</td>
            <td style="background:#eee;">${gTotal.m}</td>
            <td style="background:#eee;">${gTotal.k}</td>
            <td style="background:#eee;">${gTotal.m - gTotal.k}</td>
            <td style="background:#eee;">Rp${gTotal.uM.toLocaleString()}</td>
            <td style="background:#eee;">Rp${gTotal.uK.toLocaleString()}</td>
            <td style="background:#eee; font-weight:bold;">Rp${(gTotal.uM - gTotal.uK).toLocaleString()}</td>`;
    }
}




// --- VARIABEL KERANJANG ---
let keranjang = [];

// --- 1. FUNGSI TAMBAH ITEM KE KERANJANG ---
function tambahKeKeranjang() {
    const tgl = document.getElementById('tgl').value;
    const produkNama = document.getElementById('pilih-produk').value;
    const qtyInput = document.getElementById('jual_qty').value;
    const hJualInput = document.getElementById('harga_jual').value;

    // Validasi Input Dasar
    if (!tgl || !produkNama || qtyInput === "" || Number(qtyInput) <= 0) {
        return openModal("Data Kurang", "Harap pilih produk dan isi jumlah (kg) dengan benar.");
    }

    const qty = Number(qtyInput);
    const harga = Number(hJualInput);

    // Cek Stok Database
    let stokIdx = stok_db.findIndex(s => s.produk === produkNama);
    if (stokIdx === -1) {
        return openModal("Error", "Produk tidak ditemukan di database.");
    }
    
    // Cek Stok Apakah Cukup (Termasuk yang sudah ada di keranjang)
    let qtyDiKeranjang = 0;
    keranjang.forEach(item => {
        if(item.produk === produkNama) qtyDiKeranjang += item.qty;
    });
    
    if (stok_db[stokIdx].qty < (qty + qtyDiKeranjang)) {
        return openModal("Stok Kurang", `Sisa stok <b>${produkNama}</b> hanya ${stok_db[stokIdx].qty} kg.`);
    }

    // Masukkan ke Array Keranjang
    keranjang.push({
        id: new Date().getTime(), // ID Unik
        produk: produkNama,
        qty: qty,
        harga: harga,
        subtotal: qty * harga
    });

    renderKeranjang();
    
    // Reset input qty biar bisa input barang lain cepat
    document.getElementById('jual_qty').value = '';
    // document.getElementById('pilih-produk').focus(); // Opsional
}

// --- 2. FUNGSI RENDER TABEL KERANJANG ---
function renderKeranjang() {
    const body = document.getElementById('bodyKeranjang');
    const txtTotal = document.getElementById('txtTotalBayar');
    
    if (!body) return; // Jaga-jaga kalau elemen belum ada

    body.innerHTML = '';
    let grandTotal = 0;

    if (keranjang.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:10px; color:#999;">Keranjang Kosong</td></tr>';
        txtTotal.innerText = 'Rp 0';
        return;
    }

// Di dalam loop renderKeranjang:
    keranjang.forEach((item, index) => {
        grandTotal += item.subtotal;
        body.innerHTML += `
            <tr>
                <td class="col-produk-mod"><b>${item.produk}</b></td>
                <td class="col-qty-mod">${item.qty}</td>
                <td class="col-total-mod">Rp${item.subtotal.toLocaleString()}</td>
                <td class="col-aksi-mod">
                    <button onclick="hapusItemKeranjang(${index})" class="btn-del-mini">🗑️</button>
                </td>
            </tr>`;
    });
    

    txtTotal.innerText = 'Rp ' + grandTotal.toLocaleString();
}

// --- 3. FUNGSI HAPUS ITEM DARI KERANJANG ---
function hapusItemKeranjang(index) {
    keranjang.splice(index, 1);
    renderKeranjang();
}

function prosesBayar() {
    if (keranjang.length === 0) return openModal("Keranjang Kosong", "Belum ada barang.");

    const tgl = document.getElementById('tgl').value;
    const jualNama = document.getElementById('jual_nama').value || 'Umum';
    let totalBayar = 0;
    keranjang.forEach(i => totalBayar += i.subtotal);
    const isPiutang = document.getElementById('is-piutang').checked || false;

    openModal("Konfirmasi Pembayaran", 
        `Total: <b style="color:green;">Rp${totalBayar.toLocaleString()}</b><br>Items: ${keranjang.length}`, 
        () => {
            keranjang.forEach(item => {
                let idx = stok_db.findIndex(s => s.produk === item.produk);
                if(idx > -1) stok_db[idx].qty -= item.qty;

                db.push({
                    tgl: tgl, jual_nama: jualNama, jual_qty: item.qty, harga_jual: item.harga,
                    produk_terjual: item.produk, beli_nama: '-', beli_qty: 0, uang_keluar: 0, piutang: isPiutang
                });
            });

            // 1. CATAT KE RIWAYAT
            catatLog(`🛒 Jual Keranjang: ${keranjang.length} item (Rp${totalBayar.toLocaleString()})`, tgl);

            localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
            localStorage.setItem('egg_db', JSON.stringify(db));
            
            triggerUpdateStok();

            tampilkanStruk(keranjang, totalBayar, tgl, jualNama);

            // 2. RESET PINTAR
            keranjang = [];
            renderKeranjang();
            renderHarian(); 
            // Tanggal tidak direset
            document.getElementById('jual_nama').value = '';
        }
    );
}

// --- FITUR BARU: BAYAR LANGSUNG (SAT-SET) ---

function bayarLangsung() {
    const tgl = document.getElementById('tgl').value;
    const produkNama = document.getElementById('pilih-produk').value;
    const qtyInput = document.getElementById('jual_qty').value;
    const hJualInput = document.getElementById('harga_jual').value;
    const jualNama = document.getElementById('jual_nama').value || 'Umum';

    if (!tgl || !produkNama || qtyInput === "" || Number(qtyInput) <= 0) {
        return openModal("Data Kurang", "Harap pilih produk dan isi jumlah (kg).");
    }

    const qty = Number(qtyInput);
    const harga = Number(hJualInput);
    const total = qty * harga;

    let stokIdx = stok_db.findIndex(s => s.produk === produkNama);
    if (stokIdx === -1) return openModal("Error", "Produk tidak valid.");
    if (stok_db[stokIdx].qty < qty) {
        return openModal("Stok Kurang", `Sisa stok <b>${produkNama}</b> hanya ${stok_db[stokIdx].qty} kg.`);
    }

    openModal("Bayar Langsung", 
        `Jual <b>${produkNama} (${qty}kg)</b>?<br>Total: <b style="color:green;">Rp${total.toLocaleString()}</b>`,
        () => {
            stok_db[stokIdx].qty -= qty;

            const isPiutang = document.getElementById('is-piutang').checked;
            db.push({
                tgl: tgl, jual_nama: jualNama, jual_qty: qty, harga_jual: harga,
                produk_terjual: produkNama, beli_nama: '-', beli_qty: 0, uang_keluar: 0, piutang: isPiutang
            });

            // 1. CATAT KE RIWAYAT (LOG)
            catatLog(`💰 Jual Langsung: ${produkNama} (${qty}kg)`, tgl);

            localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
            localStorage.setItem('egg_db', JSON.stringify(db));
            
            triggerUpdateStok();

            const keranjangMini = [{ produk: produkNama, qty: qty, harga: harga, subtotal: total }];
            tampilkanStruk(keranjangMini, total, tgl, jualNama);
            
            // 2. RESET PINTAR (TANGGAL JANGAN DIHAPUS)
            document.getElementById('jual_qty').value = '';
            document.getElementById('jual_nama').value = '';
            // document.getElementById('tgl').value = ''; <--- INI DIHAPUS BIAR TANGGAL TETAP
            
            renderHarian();
            renderStokLengkap();
        }
    );
}


// --- FIX: FUNGSI AUTO HARGA ---
function autoHarga() {
    const namaProduk = document.getElementById('pilih-produk').value;
    
    // Cari produk di database stok
    const item = stok_db.find(s => s.produk === namaProduk);
    
    if(item) {
        // Isi otomatis harga jual dari database
        document.getElementById('harga_jual').value = item.harga_jual;
        
        // Opsional: Fokuskan kursor ke kolom jumlah agar cepat
        document.getElementById('jual_qty').focus();
    } else {
        document.getElementById('harga_jual').value = '';
    }
}


// --- FITUR BARU: BAYAR LANGSUNG (TANPA KERANJANG) ---
function bayarLangsung() {
    const tgl = document.getElementById('tgl').value;
    const produkNama = document.getElementById('pilih-produk').value;
    const qtyInput = document.getElementById('jual_qty').value;
    const hJualInput = document.getElementById('harga_jual').value;
    const jualNama = document.getElementById('jual_nama').value || 'Umum';

    // 1. Validasi Input
    if (!tgl || !produkNama || qtyInput === "" || Number(qtyInput) <= 0) {
        return openModal("Data Kurang", "Pilih produk dan isi jumlah (kg) dengan benar.");
    }

    const qty = Number(qtyInput);
    const harga = Number(hJualInput);
    const total = qty * harga;

    // 2. Cek Stok
    let stokIdx = stok_db.findIndex(s => s.produk === produkNama);
    if (stokIdx === -1) return openModal("Error", "Produk tidak valid.");
    if (stok_db[stokIdx].qty < qty) {
        return openModal("Stok Kurang", `Sisa stok <b>${produkNama}</b> hanya ${stok_db[stokIdx].qty} kg.`);
    }

    // 3. Konfirmasi Langsung
    openModal("Bayar Langsung", 
        `Proses transaksi langsung?<br>
         <b>${produkNama} (${qty}kg)</b><br>
         Total: <b style="color:green; font-size:16px;">Rp${total.toLocaleString()}</b>`,
        () => {
            // A. Simpan ke Database
            stok_db[stokIdx].qty -= qty; // Kurangi Stok

            // Cek Piutang
            const isPiutang = document.getElementById('is-piutang').checked;

            const itemTransaksi = {
                tgl: tgl,
                jual_nama: jualNama,
                jual_qty: qty,
                harga_jual: harga,
                produk_terjual: produkNama,
                beli_nama: '-', beli_qty: 0, uang_keluar: 0,
                piutang: isPiutang
            };
            db.push(itemTransaksi);

            // B. Update Storage
            localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
            localStorage.setItem('egg_db', JSON.stringify(db));

            // C. Buat Array Sementara Agar Struk Bisa Baca (Format Array)
            const keranjangSementara = [{
                produk: produkNama, qty: qty, harga: harga, subtotal: total
            }];

            // D. Tampilkan Struk & Update Tampilan
            tampilkanStruk(keranjangSementara, total, tgl, jualNama);
            
            // Bersihkan Input
            document.getElementById('jual_qty').value = '';
            document.getElementById('jual_nama').value = '';
            renderHarian();
            renderStokLengkap();
        }
    );
}

// --- 5. UPDATE TAMPILKAN STRUK (UNTUK BANYAK BARANG) ---

// --- UPDATE: TAMPILKAN STRUK (DATA DARI SETELAN) ---
// --- UPDATE: TAMPILKAN STRUK DENGAN HARGA SATUAN ---
function tampilkanStruk(dataKeranjang, total, tgl, namaPelanggan) {
    const modal = document.getElementById('modalStruk');
    
    // Safety Check: Pastikan elemen HTML ada
    if(!document.getElementById('strukNamaToko')) {
        alert("Eror: Kode HTML Struk belum dipasang di index.html!");
        return;
    }

    // 1. Isi Header Struk dari Profil
    document.getElementById('strukNamaToko').innerText = profil.nama || "TELUR BAROKAH";
    document.getElementById('strukAlamat').innerText = profil.alamat || "-";
    document.getElementById('strukWa').innerText = profil.wa ? "WA: " + profil.wa : "";
    
    // 2. Info Transaksi
    document.getElementById('strukTanggal').innerText = tgl;
    document.getElementById('strukNo').innerText = "NO-" + new Date().getTime().toString().substr(-5);

    // 3. Render List Belanja (FORMAT: Nama (@Harga) Qty Total)
    const listDiv = document.getElementById('strukListBelanja');
    listDiv.innerHTML = '';
    
    dataKeranjang.forEach(item => {
        listDiv.innerHTML += `
            <div style="margin-bottom: 8px; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="flex: 1; font-weight: bold; font-size: 12px;">${item.produk} (@${item.harga.toLocaleString()})</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #555; margin-top: 2px;">
                    <span>Qty: ${item.qty} kg</span>
                    <span style="font-weight: bold; color: #000;">Rp${(item.subtotal).toLocaleString()}</span>
                </div>
            </div>`;
    });

    // 4. Total Akhir
    document.getElementById('strukTotal').innerText = "Rp " + total.toLocaleString();
    
    // Munculkan Modal
    modal.style.display = "flex";
}


// --- 6. UPDATE TUTUP STRUK (AGAR TETAP DI HALAMAN) ---
function tutupStruk() {
    document.getElementById('modalStruk').style.display = "none";
    
    // Reset Form Input agar siap untuk orang berikutnya
    document.getElementById('jual_qty').value = '';
    document.getElementById('jual_nama').value = '';
    
    // Opsional: Reset piutang ke default (tidak dicentang)
    if(document.getElementById('is-piutang')) document.getElementById('is-piutang').checked = false;

    showProgress("Transaksi Selesai. Siap Input Baru!");
    
    // PERHATIKAN: Kita TIDAK memanggil switchPage().
    // Jadi layar tetap di halaman kasir.
}

// Fungsi Export Gambar Full (Persegi Panjang)



// Fitur Interaktif: Klik bulan di Laporan, lari ke Harian
function filterKeHarian(bulanNama) {
    alert("Menampilkan detail harian untuk bulan " + bulanNama);
    switchPage('page-harian', document.querySelectorAll('.nav-btn')[1]);
}





// --- UPDATE: SIMPAN PROFIL MODERN ---
function simpanProfil() {
    const namaBaru = document.getElementById('set-nama').value;
    const alamatBaru = document.getElementById('set-alamat').value;
    const waBaru = document.getElementById('set-wa').value;
    const saldoBaru = document.getElementById('set-saldo-awal').value;

    openModal("Simpan Pengaturan", 
        `Simpan perubahan profil toko?<br>Nama Toko: <b>${namaBaru}</b>`, 
        () => {
            profil.nama = namaBaru;
            profil.alamat = alamatBaru;
            profil.wa = waBaru;
            profil.saldoAwal = Number(saldoBaru);
            
            localStorage.setItem('egg_profil', JSON.stringify(profil));
            
            // Update Header di Halaman Utama Langsung
            loadProfil(); 
            showProgress("Profil Berhasil Disimpan!");
        }
    );
}

// --- UPDATE: RESET DATA MODERN ---
function resetData() {
    openModal("⚠️ HAPUS SEMUA DATA", 
        `Apakah Anda yakin ingin menghapus <b>SELURUH DATA TRANSAKSI</b>?<br>
         Stok barang dan Profil toko TIDAK akan terhapus.<br>
         <b style="color:red;">Tindakan ini tidak bisa dibatalkan!</b>`, 
        () => {
            db = []; // Kosongkan database transaksi
            localStorage.setItem('egg_db', JSON.stringify(db));
            
            renderHarian();
            renderBulanan();
            showProgress("Data Transaksi Telah Dihapus.");
        }
    );
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
        return openModal("Data Tidak Lengkap", "Lengkapi semua data pembelian.");
    }

    const modalPerKg = modalTotal / qty;

    db.push({
        tgl: tgl, beli_nama: prod, beli_qty: qty, uang_keluar: modalTotal,
        jual_nama: '-', jual_qty: 0, harga_jual: 0
    });

    let idx = stok_db.findIndex(s => s.produk.toLowerCase() === prod.toLowerCase());
    if(idx > -1) {
        stok_db[idx].qty += qty;
        stok_db[idx].modal_per_kg = modalPerKg;
        stok_db[idx].harga_jual = hJual;
    } else {
        stok_db.push({ 
            produk: prod, supplier: document.getElementById('supplier').value, 
            qty: qty, harga_jual: hJual, modal_per_kg: modalPerKg 
        });
    }

    // 1. CATAT LOG
    catatLog(`📦 Stok Masuk: ${prod} (${qty}kg)`, tgl);

    localStorage.setItem('egg_db', JSON.stringify(db));
    localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
    triggerUpdateStok();
    
    showProgress("Stok Berhasil Ditambah!");
    
    // 2. RESET FORM (KECUALI TANGGAL)
    document.getElementById('produk_masuk').value = '';
    document.getElementById('qty_masuk').value = '';
    document.getElementById('harga_modal').value = '';
    // Tanggal masuk (tgl_masuk) dibiarkan tetap sesuai inputan terakhir
    
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

// --- UPDATE: EXPORT EXCEL DENGAN FREEZE HEADER ---
function exportExcel(id, name) {
    showProgress("Membuat Excel...", 1500);
    
    setTimeout(() => {
        const element = document.getElementById(id);
        const wb = XLSX.utils.table_to_book(element, {sheet: "Laporan"});
        const ws = wb.Sheets["Laporan"];

        // FITUR BARU: FREEZE HEADER (Bekukan Baris Header)
        // ySplit: 3 artinya baris 1-3 (Header) akan diam saat di-scroll
        if(!ws['!views']) ws['!views'] = [];
        ws['!views'].push({ state: 'frozen', xSplit: 0, ySplit: 3 });

        const wbout = XLSX.write(wb, {bookType:'xlsx', type:'base64'});
        
        const link = document.createElement('a');
        const timestamp = new Date().getTime();
        
        link.href = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + wbout;
        link.download = `${name}_${timestamp}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
        }, 1000);
    }, 500);
}




function exportGambar(id, name) {
    showProgress("Merender Gambar Full...", 2500); 

    const element = document.getElementById(id); 
    if (!element) {
        alert("Eror: Area gambar tidak ditemukan!");
        return;
    }

    // Cari tabel di dalam elemen tersebut
    const table = element.querySelector('table') || element;

    // Matikan mode scroll dan freeze agar foto tidak terpotong layar HP
    element.classList.add('full-height-capture'); 
    element.classList.add('no-sticky'); 

    setTimeout(() => {
        html2canvas(table, {
            scale: 2, // Kualitas HD
            useCORS: true,
            backgroundColor: "#ffffff",
            // Paksa ukuran sesuai lebar asli tabel agar tidak gepeng
            width: table.scrollWidth,
            height: table.scrollHeight
        }).then(canvas => {
            // Kembalikan tampilan HP ke normal
            element.classList.remove('full-height-capture');
            element.classList.remove('no-sticky');

            canvas.toBlob(function(blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${name}_${new Date().getTime()}.png`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { 
                    document.body.removeChild(a); 
                    window.URL.revokeObjectURL(url);
                }, 1000);
            }, 'image/png');
            
            showProgress("✅ Berhasil Export!");
        }).catch(err => {
            element.classList.remove('full-height-capture');
            element.classList.remove('no-sticky');
            alert("Gagal export: " + err);
        });
    }, 500); 
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
// --- DATABASE SAMPAH KHUSUS STOK 

// GANTI FUNGSI hapusStok YANG LAMA DENGAN INI:
// --- UPDATE FUNGSI HAPUS STOK (FIX BUG NAMA) ---
function hapusStok(index) {
    // Pastikan data ada biar gak error
    if (!stok_db[index]) return;

    // Pakai 'produk', BUKAN 'nama_barang'
    const namaProduk = stok_db[index].produk; 

    openModal("Hapus Barang", 
        `Yakin hapus <b>${namaProduk}</b>? <br>(Akan hilang di semua HP saat Sync)`, 
        () => {
            // 1. Catat Nama Barang ke Blacklist
            deleted_stok.push(namaProduk);
            localStorage.setItem('egg_deleted_stok', JSON.stringify(deleted_stok));
            
            // 2. Hapus dari Database
            stok_db.splice(index, 1);
            localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
            
            // 3. Pemicu Waktu & Render
            triggerUpdateStok(); 
            renderStokLengkap();
            
            showProgress("Barang dihapus & dicatat.");
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
            
            triggerUpdateStok();
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

function catatLog(aktivitas, tanggal) {
    // Simpan log baru di paling atas
    log_db.unshift({ akt: aktivitas, tgl: tanggal, time: new Date().toLocaleTimeString() });
    // Batasi cuma simpan 50 riwayat terakhir biar ringan
    if(log_db.length > 50) log_db.pop();
    
    localStorage.setItem('egg_log', JSON.stringify(log_db));
    renderRiwayat(); // Update tampilan
}

// ==========================================
// 📜 FITUR RIWAYAT AKTIVITAS (LOG SYSTEM)
// ==========================================

// 1. Database Riwayat
// --- FUNGSI NAVIGASI HALAMAN (WAJIB ADA) ---
function switchPage(id, el) {
    // 1. Sembunyikan semua halaman
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // 2. Munculkan halaman target
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    
    // 3. Atur warna tombol menu bawah
    if(el) {
        document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
        el.classList.add('active');
    }

    // 4. Render ulang data sesuai halaman agar selalu fresh
    if(id === 'page-harian') renderHarian();
    if(id === 'page-bulanan') renderBulanan();
    if(id === 'page-stok') renderStokLengkap();
    if(id === 'page-setelan') {
        loadProfil();
        renderRiwayat(); // Pastikan riwayat muncul saat buka pengaturan
    }
}
// 2. Fungsi Mencatat Log (Dipanggil otomatis oleh sistem)
function catatLog(aktivitas, tanggal) {
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    // Tambah ke paling atas (Unshift)
    log_db.unshift({
        akt: aktivitas,
        tgl: tanggal,
        jam: waktu
    });

    // Batasi cuma simpan 50 riwayat terakhir (biar gak lemot)
    if(log_db.length > 50) log_db.pop();
    
    // Simpan & Render
    localStorage.setItem('egg_log', JSON.stringify(log_db));
    renderRiwayat();
}

// 3. Fungsi Menampilkan Riwayat (Render)
function renderRiwayat() {
    const container = document.getElementById('list-riwayat');
    
    // Safety Check: Kalau HTML belum dipasang, stop biar gak eror
    if(!container) return;
    
    container.innerHTML = '';

    if(log_db.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:20px; opacity:0.6;">
                <span style="font-size:30px;">📭</span>
                <p style="font-size:12px; margin-top:5px;">Belum ada aktivitas baru.</p>
            </div>`;
        return;
    }

    log_db.forEach(log => {
        // Tentukan ikon berdasarkan kata kunci
        let icon = '📝';
        if(log.akt.includes('Jual')) icon = '💰';
        if(log.akt.includes('Masuk')) icon = '📦';
        if(log.akt.includes('Hapus')) icon = '🗑️';
        if(log.akt.includes('Lunas')) icon = '✅';

        container.innerHTML += `
            <div style="display:flex; gap:10px; padding:10px 0; border-bottom:1px solid #f0f0f0; align-items:center;">
                <div style="font-size:18px;">${icon}</div>
                <div style="flex:1;">
                    <div style="font-size:13px; font-weight:500; color:#333;">${log.akt}</div>
                    <div style="font-size:10px; color:#888;">${log.tgl} • Pukul ${log.jam}</div>
                </div>
            </div>
        `;
    });
}

// 4. Hapus Riwayat
function resetRiwayat() {
    openModal("Bersihkan Riwayat", 
        "Hapus semua catatan aktivitas? Data transaksi penjualan TIDAK akan terhapus.",
        () => {
            log_db = [];
            localStorage.removeItem('egg_log');
            renderRiwayat();
            showProgress("Riwayat Bersih!");
        }
    );
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


// --- DATABASE SAMPAH (Untuk Sinkronisasi Hapus) ---

// --- 1. UPDATE FUNGSI HAPUS (Agar Tercatat) ---
// Ganti fungsi hapusTransaksi yang lama dengan ini
function hapusTransaksi(index) {
    const item = db[index];
    const info = item.beli_nama !== '-' ?
        `Pembelian: ${item.beli_nama}` :
        `Penjualan: ${item.produk_terjual}`;
    
    openModal("Hapus Data",
        `Hapus <b>${info}</b>?<br>Data akan ikut terhapus di HP lain saat Sync.`,
        () => {
            // 1. Buat Sidik Jari Unik Data Ini
            // (Gabungan Tgl + Produk + Qty + Jam + Uang)
            const sidikJari = `${item.tgl}-${item.produk_terjual}-${item.jual_qty}-${item.uang_keluar}-${item.harga_jual}`;
            
            // 2. Masukkan ke Daftar Sampah (Blacklist)
            deleted_ids.push(sidikJari);
            localStorage.setItem('egg_deleted', JSON.stringify(deleted_ids));
            
            // 3. Hapus dari Database Lokal
            db.splice(index, 1);
            localStorage.setItem('egg_db', JSON.stringify(db));
            
            // 4. Catat Log (Agar ketahuan siapa yg hapus)
            catatLog(`🗑️ Menghapus: ${info}`, item.tgl);
            
            renderHarian();
            showProgress("Data dihapus & dicatat untuk Sync.");
        }
    );
}

// --- 2. FITUR SYNC SATU TOMBOL (AUTO PILOT) ---
// Ini menggantikan fungsi syncKeAwan dan tarikDariAwan yang lama
// === UPDATE: LOGIC SYNC DENGAN CEK WAKTU (TIMESTAMP) ===



// === UPDATE: SYNC DENGAN FITUR HAPUS STOK (ANTI MUNCUL LAGI) ===

// === UPDATE: SYNC FINAL (FIX NAMA BARANG & ABORT ERROR) ===

// === UPDATE FINAL: SYNC ROBUST (ANTI ABORT & SALAH BACA) ===
// === VERSI FINAL: SYNC SABAR (ANTI ABORT ERROR) ===
async function syncSatuTombol() {
    if (!navigator.onLine) {
        alert("❌ Tidak ada internet. Cek Data/WiFi.");
        return;
    }

    try {
        showProgress("🔄 Menghubungkan Server...", 9999); // Durasi panjang biar gak hilang

        // 1. AMBIL DATA (Tanpa Timer Manual penyebab Abort)
        const { data, error } = await dbAwan
            .from('tb_telur_barokah')
            .select('content')
            .eq('id', 1)
            .single();

        if (error) {
            // Jika error koneksi, lempar ke catch
            throw new Error(error.message);
        }

        // Siapkan wadah data
        let serverData = { transaksi: [], sampah: [], stok: [], sampah_stok: [], riwayat: [], waktu_stok: 0 };
        if (data && data.content) serverData = data.content;

        showProgress("⚙️ Memproses Data...", 2000);

        // --- A. SYNC STOK (LOGIKA BARU) ---
        // Gabung Sampah Stok
        const totalSampahStok = new Set([...deleted_stok, ...(serverData.sampah_stok || [])]);
        
        // Helper Nama
        const ambilNama = (item) => item.produk || item.nama_barang || "Tanpa Nama";

        // Bersihkan Server dari barang sampah
        if(serverData.stok && Array.isArray(serverData.stok)) {
            serverData.stok = serverData.stok.filter(item => !totalSampahStok.has(ambilNama(item)));
        }

        // Bersihkan HP dari barang sampah
        stok_db = stok_db.filter(item => !totalSampahStok.has(ambilNama(item)));

        // Adu Waktu (Timestamp)
        const waktuHP = parseInt(localStorage.getItem('last_stok_update') || '0');
        const waktuServer = serverData.waktu_stok || 0;

        if (waktuServer > waktuHP) {
            if(serverData.stok && serverData.stok.length > 0) {
                stok_db = serverData.stok;
                localStorage.setItem('last_stok_update', waktuServer);
            }
        }
        
        // --- B. SYNC TRANSAKSI ---
        const semuaSampah = new Set([...deleted_ids, ...(serverData.sampah || [])]);
        
        // Filter & Gabung
        let serverTrxBersih = (serverData.transaksi || []).filter(item => !semuaSampah.has(bikinID(item)));
        db = db.filter(item => !semuaSampah.has(bikinID(item)));

        const jejakHP = new Set(db.map(item => bikinID(item)));
        let dataBaru = 0;
        
        serverTrxBersih.forEach(item => {
            if (!jejakHP.has(bikinID(item))) {
                db.push(item);
                dataBaru++;
            }
        });

        // --- C. SYNC RIWAYAT ---
        let logGabung = [...log_db, ...(serverData.riwayat || [])];
        const logMap = new Map();
        logGabung.forEach(l => logMap.set(l.tgl + l.akt, l));
        log_db = Array.from(logMap.values())
                 .sort((a,b) => new Date(b.tgl + ' ' + b.jam) - new Date(a.tgl + ' ' + a.jam))
                 .slice(0, 50);

        // --- D. UPLOAD FINAL ---
        showProgress("☁️ Menyimpan Data...", 9999);

        const waktuFinal = (waktuHP > waktuServer) ? waktuHP : waktuServer;
        const paketFinal = {
            transaksi: db,
            sampah: Array.from(semuaSampah),
            stok: stok_db, 
            sampah_stok: Array.from(totalSampahStok),
            waktu_stok: waktuFinal, 
            profil: profil,
            riwayat: log_db,
            tgl_sync: new Date().toLocaleString()
        };

        const { error: errUp } = await dbAwan
            .from('tb_telur_barokah')
            .upsert({ id: 1, content: paketFinal });

        if (errUp) throw errUp;

        // Simpan Lokal
        localStorage.setItem('egg_db', JSON.stringify(db));
        localStorage.setItem('egg_deleted', JSON.stringify(Array.from(semuaSampah)));
        localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
        localStorage.setItem('egg_deleted_stok', JSON.stringify(Array.from(totalSampahStok))); 
        localStorage.setItem('egg_profil', JSON.stringify(profil));
        localStorage.setItem('egg_log', JSON.stringify(log_db));

        // Render Ulang
        loadProfil();
        renderHarian();
        renderStokLengkap();
        renderRiwayat();
        
        let pesan = dataBaru > 0 ? `✅ Masuk ${dataBaru} Data Baru.` : "✅ Data Sinkron.";
        showProgress(pesan);

    } catch (err) {
        showProgress("❌ Gagal!", 1000);
        // Alert detail errornya
        setTimeout(() => alert("Gagal Sync: " + err.message), 500);
    }
}

// Helper bikin ID unik
function bikinID(item) {
    return `${item.tgl}-${item.produk_terjual}-${item.jual_qty}-${item.uang_keluar}-${item.harga_jual}`;
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



// --- FUNGSI PEMBANTU DOWNLOAD (Wajib Ada) ---
// --- FUNGSI PENYELAMAT DOWNLOAD (VERSI FINAL) ---
// --- FUNGSI PENYELAMAT DOWNLOAD (VERSI FINAL & STABIL) ---
function saveAsFile(blob, filename) {
    // 1. Buat alamat memori virtual (URL Pendek)
    const url = window.URL.createObjectURL(blob);
    
    // 2. Buat elemen link tersembunyi
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename; // Ini yang memaksa nama file
    
    // 3. Pasang ke halaman, klik, lalu buang
    document.body.appendChild(a);
    a.click();
    
    // 4. Bersihkan memori setelah jeda aman
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}


// --- FITUR SHARE & PRINT (VERSI FINAL) ---

function shareGambarStruk() {
    showProgress("Menyiapkan Share...", 1000);
    const element = document.getElementById('areaStruk');
    
    // Pastikan pakai html2canvas untuk foto struk
    html2canvas(element, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        canvas.toBlob(function(blob) {
            // Cek fitur Share Bawaan HP
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], "Struk_Belanja.png", { type: "image/png" });
                
                if (navigator.canShare({ files: [file] })) {
                    navigator.share({
                        files: [file],
                        title: 'Struk Belanja',
                        text: 'Terima kasih telah berbelanja di ' + (profil.nama || 'Toko Kami')
                    }).catch((error) => console.log('Share dibatalkan', error));
                } else {
                    downloadStruk(); // Fallback
                }
            } else {
                downloadStruk(); // Fallback HP Lama
            }
        }, 'image/png');
    });
}

function downloadStruk() {
    exportGambar('areaStruk', 'Struk_TelurBarokah');
}

function printPDF() {
    const printContent = document.getElementById('areaStruk').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = "<div style='width:300px; margin:auto;'>" + printContent + "</div>";
    window.print();
    document.body.innerHTML = originalContent;
    location.reload(); 
}

// --- INISIALISASI APLIKASI ---

function setTanggalOtomatis() {
    const today = new Date().toISOString().split('T')[0];
    // Hanya isi jika kosong (agar tidak menimpa pilihan user saat refresh)
    if(!document.getElementById('tgl').value) document.getElementById('tgl').value = today;
    if(!document.getElementById('tgl_masuk').value) document.getElementById('tgl_masuk').value = today;
}



// --- UPDATE: INIT APP (Tanggal Otomatis) ---
function initApp() {
    loadProfil();
    updateYearFilter();
    renderStokLengkap(); 
    renderHarian();
    renderBulanan();
    renderRiwayat();
    
    // SET TANGGAL OTOMATIS (HARI INI)
    const today = new Date().toISOString().split('T')[0];
    
    // Set di Filter Harian
    const fMulai = document.getElementById('filter-tgl-mulai');
    const fAkhir = document.getElementById('filter-tgl-akhir');
    if(fMulai && !fMulai.value) fMulai.value = today;
    if(fAkhir && !fAkhir.value) fAkhir.value = today;

    // Set di Input Jual & Beli (jika masih kosong)
    const tglJual = document.getElementById('tgl');
    const tglBeli = document.getElementById('tgl_masuk');
    if(tglJual && !tglJual.value) tglJual.value = today;
    if(tglBeli && !tglBeli.value) tglBeli.value = today;
    
    // Refresh Harian agar langsung menampilkan data hari ini
    renderHarian();
}

// Jalankan Aplikasi
initApp();

// --- FUNGSI DARURAT: PERBAIKI DATA RUSAK (NaN & TANGGAL EXCEL) ---
function perbaikiData() {
    let fixCount = 0;
    
    db = db.map(item => {
        // 1. Ubah NaN menjadi 0
        if (isNaN(item.jual_qty)) item.jual_qty = 0;
        if (isNaN(item.beli_qty)) item.beli_qty = 0;
        if (isNaN(item.harga_jual)) item.harga_jual = 0;
        if (isNaN(item.uang_keluar)) item.uang_keluar = 0;

        // 2. Ubah Tanggal Excel (46040) jadi Tanggal Biasa
        // Cek jika tanggalnya berupa angka (misal 46040)
        if (typeof item.tgl === 'number' || (typeof item.tgl === 'string' && !item.tgl.includes('-'))) {
             const serial = Number(item.tgl);
             if (!isNaN(serial) && serial > 10000) { // Pastikan angka valid
                 const utc_days  = Math.floor(serial - 25569);
                 const date_info = new Date(utc_days * 86400 * 1000);
                 const y = date_info.getFullYear();
                 const m = String(date_info.getMonth() + 1).padStart(2, '0');
                 const d = String(date_info.getDate()).padStart(2, '0');
                 item.tgl = `${y}-${m}-${d}`;
                 fixCount++;
             }
        }
        return item;
    });

    localStorage.setItem('egg_db', JSON.stringify(db));
    
    renderHarian();
}

// Panggil otomatis sekali saat script dimuat untuk membereskan masalahmu sekarang
perbaikiData();

// ===========================================
// 🛠️ PERBAIKAN FITUR IMPORT & EXPORT
// ===========================================

// 1. FUNGSI IMPORT EXCEL (SOLUSI EROR 'NOT DEFINED')
// --- UPDATE FIX: IMPORT EXCEL (ANTI CRASH & LEBIH PINTAR) ---
function importExcel(input) {
    const file = input.files[0];
    if(!file) return;

    showProgress("Membaca File Excel...", 1000);

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        
        const workbook = XLSX.read(data, {type: 'binary'});
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Baca data mulai baris ke-4 (Index 3)
        const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1, range: 3});

        if(jsonData.length === 0) {
            alert("File Excel kosong!");
            return;
        }

        // --- HELPER: KONVERSI TANGGAL YANG LEBIH KUAT (ROBUST) ---
        const excelDateToJS = (serial) => {
            // 1. Jika kosong, anggap tidak valid
            if (!serial) return null;

            // 2. Jika sudah berupa teks tanggal "2024-01-01"
            if (typeof serial === 'string' && serial.includes('-')) return serial;

            // 3. Coba ubah jadi angka (misal: 46040)
            const num = Number(serial);
            
            // Jika hasilnya NaN (Bukan Angka), berarti ini Teks Header/Saldo -> KEMBALIKAN NULL
            if (isNaN(num)) return null;

            // 4. Konversi Angka Excel ke Tanggal JS
            const utc_days  = Math.floor(num - 25569);
            const date_info = new Date(utc_days * 86400 * 1000);

            // Cek apakah hasil tanggalnya valid
            if (isNaN(date_info.getTime())) return null;

            return date_info.toISOString().split('T')[0];
        };

        const cleanNum = (val) => {
            if (!val) return 0;
            const str = val.toString();
            // Abaikan strip atau string kosong
            if (str.trim() === '-' || str.trim() === '') return 0; 
            // Ambil hanya angka, titik, dan minus (jika ada rugi)
            const cleaned = str.replace(/[^0-9.-]/g, ""); 
            return cleaned ? Number(cleaned) : 0;
        };

        // --- FILTER DATA VALID DULU ---
        // Kita hanya hitung baris yang tanggalnya valid
        let validRows = [];
        jsonData.forEach(row => {
            const tglFixed = excelDateToJS(row[0]);
            if(tglFixed) { // Cuma ambil kalau tanggalnya sukses dikonversi
                row._tglFixed = tglFixed; // Simpan hasil konversi biar gak hitung 2x
                validRows.push(row);
            }
        });

        openModal("Konfirmasi Import", 
            `Ditemukan <b>${validRows.length} data transaksi valid</b>.<br>(Baris header/saldo akan dilewati otomatis).<br>Lanjutkan import?`,
            () => {
                let count = 0;
                validRows.forEach(row => {
                    db.push({
                        tgl: row._tglFixed, // Pakai tanggal yang sudah dicek tadi
                        beli_nama: row[1] || '-',
                        beli_qty: cleanNum(row[2]),
                        jual_nama: row[3] || '-',
                        jual_qty: cleanNum(row[4]),
                        produk_terjual: row[3] || 'Produk Import',
                        harga_jual: cleanNum(row[6]),
                        uang_keluar: cleanNum(row[8]),
                        piutang: false
                    });
                    count++;
                });

                localStorage.setItem('egg_db', JSON.stringify(db));
                // Matikan perbaikiData() karena sudah difilter di awal
                renderHarian();
                renderStokLengkap();
                showProgress(`Berhasil import ${count} data!`);
            }
        );
        input.value = ''; // Reset input file
    };
    reader.readAsBinaryString(file);
}


// 2. FUNGSI EXPORT EXCEL (FREEZE HEADER DI FILE XLS)
function exportExcel(id, name) {
    showProgress("Download Excel...", 1500);
    
    setTimeout(() => {
        const element = document.getElementById(id);
        const wb = XLSX.utils.table_to_book(element, {sheet: "Laporan"});
        const ws = wb.Sheets["Laporan"];

        // TRIK FREEZE HEADER DI FILE EXCEL ASLI
        // Baris 0, 1, 2 (Total 3 baris header) akan beku
        if(!ws['!views']) ws['!views'] = [];
        ws['!views'].push({ state: 'frozen', xSplit: 0, ySplit: 3 });

        const wbout = XLSX.write(wb, {bookType:'xlsx', type:'base64'});
        const link = document.createElement('a');
        const timestamp = new Date().getTime();
        
        link.href = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + wbout;
        link.download = `${name}_${timestamp}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        setTimeout(() => { document.body.removeChild(link); }, 1000);
    }, 500);
}

// 3. PEMBERSIH DATA (AUTO RUN)
function perbaikiData() {
    db = db.map(item => {
        if (isNaN(item.jual_qty)) item.jual_qty = 0;
        if (isNaN(item.uang_keluar)) item.uang_keluar = 0;
        if (typeof item.tgl === 'number') { // Fix Tanggal Angka
             const d = new Date((item.tgl - 25569) * 86400 * 1000);
             item.tgl = d.toISOString().split('T')[0];
        }
        return item;
    });
    localStorage.setItem('egg_db', JSON.stringify(db));
}

// ==========================================
// 🛡️ FITUR BACKUP & RESTORE (JSON SYSTEM)
// ==========================================

// 1. FUNGSI BACKUP (Download Semua Data)
function backupData() {
    showProgress("Menyiapkan file cadangan...", 1500);
    
    // Satukan semua database ke dalam satu objek
    const fullBackup = {
        transaksi: db,
        stok: stok_db,
        profil: profil,
        riwayat: log_db,
        version: "1.0",
        date: new Date().toLocaleString()
    };

    // Ubah jadi teks JSON
    const dataStr = JSON.stringify(fullBackup, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    
    // Gunakan fungsi penyelamat download yang sudah kita buat sebelumnya
    const timestamp = new Date().toISOString().split('T')[0];
    saveAsFile(blob, `BACKUP_TELURBAROKAH_${timestamp}.json`);
    
    showProgress("✅ Backup Berhasil Diunduh!");
}

// 2. FUNGSI RESTORE (Tambah Data dari Backup)
function restoreData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dataImport = JSON.parse(e.target.result);

            // Validasi sederhana apakah ini file backup Telur Barokah
            if (!dataImport.transaksi || !dataImport.stok) {
                throw new Error("Format file backup tidak dikenali!");
            }

            const jmlBaru = dataImport.transaksi.length;

            openModal("Konfirmasi Import", 
                `Apakah Anda ingin MENAMBAHKAN <b>${jmlBaru} data transaksi</b> dan memperbarui database?<br><br>
                <i>*Catatan: Data baru akan digabungkan dengan data yang sudah ada.</i>`,
                () => {
                    // A. Gabungkan Transaksi (Append)
                    db = [...db, ...dataImport.transaksi];
                    
                    // B. Gabungkan Riwayat (Append)
                    if(dataImport.riwayat) {
                        log_db = [...log_db, ...dataImport.riwayat];
                    }

                    // C. Update Stok & Profil (Timpa dengan yang terbaru jika perlu)
                    // Untuk stok, kita pilih yang jumlahnya lebih banyak atau timpa saja
                    if(dataImport.stok.length > 0) {
                        stok_db = dataImport.stok; 
                    }
                    if(dataImport.profil) {
                        profil = dataImport.profil;
                    }

                    // D. Simpan ke LocalStorage
                    localStorage.setItem('egg_db', JSON.stringify(db));
                    localStorage.setItem('egg_stok_db', JSON.stringify(stok_db));
                    localStorage.setItem('egg_profil', JSON.stringify(profil));
                    localStorage.setItem('egg_log', JSON.stringify(log_db));

                    // E. Refresh Semua Tampilan
                    loadProfil();
                    renderHarian();
                    renderStokLengkap();
                    renderRiwayat();
                    renderBulanan(); // Fix error bulanan juga

                    showProgress("🚀 Data Berhasil Digabungkan!");
                }
            );
        } catch (err) {
            alert("Gagal membaca file: " + err.message);
        }
        input.value = ''; // Reset input
    };
    reader.readAsText(file);
}


// --- ALAT DIAGNOSA MASALAH KONEKSI ---
async function cekJalurServer() {
    showProgress("🕵️ Mendiagnosa Jalur...", 2000);
    
    const urlTarget = 'https://arcgcwsacncqevtiyir.supabase.co'; // URL Proyekmu
    
    try {
        // Kita coba ping servernya langsung tanpa lewat library Supabase
        const response = await fetch(urlTarget, {
            method: 'HEAD',
            mode: 'no-cors' // Trik bypass aturan ketat browser
        });
        
        // Kalau sampai sini, berarti jalur TERBUKA
        alert("✅ DIAGNOSA: Jalur Internet ke Supabase TERBUKA!\nMasalahnya ada di pengaturan Key/Library, bukan sinyal.");
        
    } catch (err) {
        // Kalau masuk sini, berarti jalur DIBLOKIR
        alert("❌ DIAGNOSA: Jalur DIBLOKIR Browser/HP!\nError: " + err.message + "\n\nSolusi:\n1. Matikan AdBlock/DNS Pribadi\n2. Buka di Chrome (jangan di preview editor)");
    }
}

// Fungsi Pemicu Update Waktu Stok
function triggerUpdateStok() {
    const waktuSekarang = Date.now(); // Ambil waktu detik ini
    localStorage.setItem('last_stok_update', waktuSekarang);
    console.log("Waktu Stok Diupdate: " + waktuSekarang);
}