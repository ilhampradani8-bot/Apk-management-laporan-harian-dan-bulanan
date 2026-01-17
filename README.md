# Apk-management-laporan-harian-dan-bulanan
Open Source by ilham Pradani 


📱 PANDUAN PENGGUNAAN APLIKASI: TELUR BAROKAH
Versi: 2.0 (Official Release)

Selamat datang di aplikasi manajemen stok dan laporan Telur Barokah. Aplikasi ini dirancang khusus untuk mempermudah pencatatan stok, penjualan, dan pembuatan laporan harian secara otomatis, baik saat Online maupun Offline (tanpa kuota).

1️⃣ CARA MEMULAI & INSTALASI
Buka Aplikasi: Klik ikon "Telur Barokah" di layar HP Anda.

Tampilan Awal: Anda akan langsung melihat dashboard laporan stok hari ini.

Izin Penyimpanan:

Saat pertama kali Anda menekan tombol Export Gambar atau Excel, mungkin akan muncul pertanyaan izin "Allow access to photos/media?".

WAJIB PILIH: ALLOW / IZINKAN.

Logika: Aplikasi butuh izin ini untuk menyimpan hasil laporan ke Galeri HP Anda.

2️⃣ CARA PENGGUNAAN HARIAN
A. Input & Edit Data

Cukup ketik angka pada kolom yang tersedia (Stok Awal, Masuk, Keluar, dll).

Sistem akan otomatis menghitung sisa stok dan total saldo secara real-time (langsung berubah tanpa perlu tekan tombol hitung).

B. Fitur Export Gambar (Laporan Visual)

Gunakan fitur ini untuk laporan cepat via WhatsApp.

Klik tombol "Export Gambar".

Tunggu proses rendering (1-2 detik).

Akan muncul notifikasi "Download Selesai".

Cek Galeri HP atau folder Download. Hasilnya berupa foto (.PNG/.JPG) tabel laporan yang rapi dan siap kirim.

C. Fitur Export Excel (Arsip Data)

Gunakan fitur ini untuk pembukuan bulanan/tahunan.

Klik tombol "XLS / Excel".

File .xlsx akan otomatis terunduh.

File ini bisa dibuka di aplikasi WPS Office, Microsoft Excel, atau Google Sheets di HP/Laptop.

3️⃣ FITUR OFFLINE (MODE TANPA SINYAL)
Aplikasi ini dilengkapi teknologi Smart Cache.

Cara Pakai: Anda bisa membuka dan menggunakan aplikasi ini di mana saja, bahkan di gudang yang tidak ada sinyal internet sama sekali.

Syarat: Minimal pernah membuka aplikasi 1x saat ada internet agar sistem menyimpan data ke memori HP. Setelah itu, bebas dipakai offline selamanya.

⚙️ PENJELASAN LOGIKA SISTEM (UNDER THE HOOD)
Untuk transparansi teknis, berikut adalah penjelasan bagaimana aplikasi ini bekerja:

1. Teknologi Hybrid (PWA + Native Android) Aplikasi ini bukan sekadar website biasa, tapi menggunakan teknologi Progressive Web App (PWA) yang dibungkus menjadi aplikasi Android (APK).

Keunggulan: Aplikasi sangat ringan (di bawah 5 MB), tidak membebani memori HP, tapi performanya setara aplikasi berat lainnya.

2. Sistem Penyimpanan Data (Auto-Save) Aplikasi menggunakan penyimpanan lokal (Local Storage) di browser Chrome Android Anda.

Penting: Jika Anda menekan tombol "Refresh" atau menutup aplikasi, data inputan sementara mungkin akan kembali ke posisi awal (Reset), kecuali fitur simpan otomatis diaktifkan. Disarankan segera Export Gambar/Excel setelah selesai input data sebelum menutup aplikasi.

3. Logika Export Gambar (High Definition) Sistem tidak melakukan "Screenshot" biasa yang pecah. Sistem melakukan Re-Draw (gambar ulang) tabel Anda piksel demi piksel dengan resolusi tinggi di memori, lalu mengonversinya menjadi file gambar digital.

Hasil: Tulisan tetap tajam dan jelas meskipun di-zoom.

4. Keamanan & Privasi Aplikasi ini berjalan 100% di HP Anda (Client Side). Data keuangan dan stok Anda TIDAK dikirim ke server luar mana pun. Data aman tersimpan di tangan Anda sendiri.

Jika ada kendala atau pertanyaan teknis lebih lanjut, silakan hubungi tim Developer kami.

Selamat Bekerja & Semoga Barokah!
