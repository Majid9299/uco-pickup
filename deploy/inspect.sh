#!/usr/bin/env bash
# فحص السيرفر قبل أي تغيير — قراءة فقط، ما يعدّل ولا شي.
echo "════════ النظام ════════"
hostnamectl 2>/dev/null | sed -n '1,6p' || uname -a
echo; echo "════════ الذاكرة والقرص ════════"
free -h; echo; df -h / /var 2>/dev/null | grep -v tmpfs

echo; echo "════════ Docker ════════"
if command -v docker >/dev/null; then
  docker --version; docker compose version 2>/dev/null || echo "compose plugin مفقود"
  echo "--- حاويات شغّالة ---"
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
else
  echo "Docker غير مثبّت"
fi

echo; echo "════════ PostgreSQL ════════"
if command -v psql >/dev/null; then
  sudo -u postgres psql -tAc "select version();" 2>/dev/null || psql -V
  echo "--- القواعد الموجودة (لا ألمسها) ---"
  sudo -u postgres psql -tAc \
    "select datname, pg_size_pretty(pg_database_size(datname)) from pg_database where not datistemplate;" 2>/dev/null
  echo "--- الإضافات المتاحة (يحتاجها Supabase) ---"
  sudo -u postgres psql -tAc \
    "select name from pg_available_extensions where name in ('pgcrypto','pgjwt','uuid-ossp','pg_stat_statements','pgsodium');" 2>/dev/null
  echo "--- على وش يسمع ---"
  ss -tlnp 2>/dev/null | grep 5432
else
  echo "psql مو موجود بالمسار (ممكن Postgres داخل حاوية)"
fi

echo; echo "════════ nginx ════════"
nginx -v 2>&1
echo "--- المواقع المفعّلة (المشاريع الأربعة) ---"
ls -1 /etc/nginx/sites-enabled/ 2>/dev/null || ls -1 /etc/nginx/conf.d/ 2>/dev/null
echo "--- أسماء النطاقات المخدومة ---"
grep -rhoP 'server_name\s+\K[^;]+' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | sort -u

echo; echo "════════ الجدار الناري ════════"
ufw status 2>/dev/null || iptables -S 2>/dev/null | head -20

echo; echo "════════ مهام cron الحالية ════════"
crontab -l 2>/dev/null || echo "(ما فيه)"
