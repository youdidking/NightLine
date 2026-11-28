# NightLine 2.6.3

- بازنشانی settings/state با حفظ دسترسی‌ها؛ بکاپ هش‌دار، رسید کوتاه‌عمر، تأیید دانلود و تایپ RESET، کنترل مدیر/Origin و لاگ ممیزی.
- محافظت آپدیتر: NL_GH_REPO، SHA-256 اجباری یا تأیید صریح همان بایت‌ها، version/Force، بکاپ کد، rollback دستی و تلاش rollback در خطای PUT، حفظ bindingها. بررسی اختیاری امضای Ed25519 با کلید عمومی معتبرِ pin‌شده؛ انتشار رسمی امضاشده در این محیط ساخته/تأیید نشده است.
- کارگاه: device/locale، v0a737 اختیاری WireGuard، کارت اطلاعات واقعی، reserved از client_id واقعی، aliasهای usque و حفظ پورت فایل واردشده؛ DNS آزاد و پیشنهادهای بیشتر.
- خروجی چندپروفایل MASQUE، count ۱–۱۰ از یک حساب، مقصدهای IPv4/IPv6 و ترکیبی، چرخش پورت، ۲۴ پیشنهاد SNI با ورودی آزاد، مسیریابی ایران با geodata اختیاری.
- خروجی‌های client-specific: Xray JSON، Mihomo MASQUE YAML، Shadowrocket masque:// H2 و Hiddify JSON با transport auto/H2/H3. تبدیل کلید SEC1 برای parser واقعی Mihomo اصلاح شد. فایل ساخته‌شده معادل اتصال موفق نیست.
- batching مصرف KV با پیش‌فرض پنج دقیقه، تخمین نوشتن state، هشدار ۹۰۰، backoff ده دقیقه و نمودار مصرف ثبت‌شده ۷/۳۰ روز به UTC.
- ETag/304 خصوصی اشتراک بعد از اعتبارسنجی؛ userinfo روی 304 تازه است. ECH غیرعملیاتی فعال نمی‌شود.
