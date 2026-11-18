# Hafif Mineflayer AFK Client

Windows 11 üzerinde Minecraft Java Edition grafik istemcisi açmadan, terminalden en fazla beş offline-mode botu yönetir. Botlar hareket etmez ve gereksiz paket göndermez; yalnızca Mineflayer bağlantısının gerektirdiği protokol trafiği kullanılır.

## Mimari

- `src/config.js`: `.env` değerlerini doğrular; sunucu, sürüm, bot adları, giriş ve yeniden bağlanma ayarlarını yükler.
- `src/bot-manager.js`: Her bot için durum makinesi, bağlantı sonrası giriş/oyun komutları, kontrollü üstel geri çekilmeli yeniden bağlanma ve toplu/tekil başlatma-durdurma işlemlerini yönetir.
- `src/terminal-ui.js`: Yerleşik `readline` ile hafif terminal panelini ve komutları sağlar.
- `src/web-ui.js`: Yerel tarayıcı arayüzünü, bot kartlarını ve kontrol API'sini sağlar.
- `src/gui.js`: Arayüz sunucusunu başlatır ve tarayıcıyı otomatik açar.
- `src/index.js`: Uygulamayı başlatır ve kapanış sinyallerini güvenli biçimde işler.

Varsayılan Minecraft sürümü `1.20.1`'dir. Sunucunuz 1.18.2 kullanıyorsa yalnızca `MC_VERSION=1.18.2` yapın. Offline sunucularda `auth=offline` kullanılır. Bot adı sunucuya bağlanır; parola gerekiyorsa `/login` komutu, ardından varsayılan olarak `/boxmining` ve `/warp afk` komutları otomatik gönderilir. Parolalar yalnızca yerel `.env` dosyasından okunur ve panele/loglara yazılmaz.

## Windows 11 kurulumu

1. Node.js 18.17 veya daha yeni bir LTS sürümünü [nodejs.org](https://nodejs.org/) üzerinden kurun.
2. PowerShell açın ve proje klasörüne gidin:

   ```powershell
   cd "C:\Users\zaina\Desktop\AFK Client For AloneTulip77852"
   ```

3. Örnek ayar dosyasını kopyalayın:

   ```powershell
   Copy-Item .env.example .env
   ```

4. `.env` dosyasını düzenleyin. `MC_HOST`, `MC_PORT`, `MC_VERSION` ve benzersiz `BOT_NAMES` değerlerini sunucunuza göre ayarlayın. Beşten az bot kullanacaksanız `BOT_NAMES` içinde yalnızca istediğiniz adları bırakın.
5. Her botun sunucudaki hesabına ait parolayı aynı sıradaki değişkene yazın:

   ```dotenv
   BOT_NAMES=ZainAFK1,ZainAFK2
   BOT_1_PASSWORD=ilkBotParolasi
   BOT_2_PASSWORD=ikinciBotParolasi
   LOGIN_COMMAND=/login
   LOGIN_DELAY_MS=1500
   AFTER_LOGIN_COMMANDS=/boxmining,/warp afk
   COMMAND_DELAY_MS=2000
   ```

   `AFTER_LOGIN_COMMANDS` komutları virgülle ayrılmış sırayla gönderir. Komutlar arasındaki bekleme `COMMAND_DELAY_MS` değeridir. Sunucunuz `/login <parola>` yerine farklı bir komut kullanıyorsa `LOGIN_COMMAND` değerini değiştirin. Parolaları paylaşmayın ve `.env` dosyasını GitHub'a yüklemeyin. Hesaplar ilk kez kayıt istiyorsa, sunucunun kuralına göre önce `/register <parola> <parola>` işlemini manuel yapın; bu istemci otomatik kayıt komutu göndermez.
6. Bağımlılıkları kurun:

   ```powershell
   npm install
   ```

7. İstemciyi çalıştırın:

   ```powershell
   npm start
   ```

Tarayıcı arayüzünü açmak için:

```powershell
npm run gui
```

Alternatif olarak proje kökündeki `AFK-GUI.js` dosyasını şu komutla çalıştırabilirsiniz:

```powershell
node AFK-GUI.js
```

Bu komut `http://127.0.0.1:3210` adresinde hafif bir kontrol paneli açar. Arayüzden tüm botları veya botları tek tek başlatıp durdurabilirsiniz; terminal sürümü `npm start` ile çalışmaya devam eder.

Bot kartındaki `Envanter` düğmesi, bağlı botun oyuncu envanterini 9x4 slot düzeninde salt okunur gösterir. Bot bağlı değilse slotlar boş görünür.

Sunucuda bot adlarının kabul edildiğinden ve bot kullanımının sunucu kurallarına uygun olduğundan emin olun.

## Terminal komutları

| Komut | İşlem |
| --- | --- |
| `b1` ... `b5` | İlgili botu başlatır |
| `d1` ... `d5` | İlgili botu durdurur |
| `ba` | Tüm botları başlatır |
| `da` | Tüm botları durdurur |
| `h` | Yardım gösterir |
| `q` | Tüm botları kapatıp çıkar |

Panel her botun durumunu, bağlantıdan beri geçen süreyi, son hata mesajını ve toplam aktif bot sayısını gösterir. Bağlantı koparsa gecikme 5 saniyeden başlayıp en fazla 60 saniyeye kadar çıkar; bot `d1` gibi bir komutla durdurulmuşsa yeniden bağlanmaz.
