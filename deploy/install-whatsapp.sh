#!/usr/bin/env bash
# تثبيت أو تحديث خدمة واتساب uco-pickup على سيرفر إنڤير — يشغّله ماجد كـ root.
# - الخدمة في حاوية uco-wa تسمع على 127.0.0.1:3040 فقط (لا منفذ جديد للعالم).
# - جلسة واتساب الشركة في /root/uco-wa-data (تبقى بين التحديثات، لا تُحذف).
# - ADMIN_TOKEN يُقرأ من الإدخال أول مرة فقط ويُحفظ في /root/uco-wa.env (600)،
#   ولا يُطبع أبداً. يجب أن يساوي NEXT_PUBLIC_WHATSAPP_ADMIN_TOKEN في .env.local.
set -euo pipefail
REPO=/root/uco-pickup
DATA=/root/uco-wa-data
ENVF=/root/uco-wa.env
PORT=3040

mkdir -p "$DATA"
if [ ! -s "$ENVF" ]; then
  read -r TOKEN || true
  TOKEN=${TOKEN%$'\r'}   # PowerShell يضيف \r في نهاية السطر
  if [ "${#TOKEN}" -lt 8 ] || [ "$TOKEN" = "change-me" ]; then
    echo "✗ ADMIN_TOKEN فارغ أو قصير — لم يُثبَّت شيء"; exit 1
  fi
  ( umask 077
    printf 'ADMIN_TOKEN=%s\nALLOWED_ORIGIN=https://majid9299.github.io\nWA_SESSION_DIR=/data/wa-session\n' "$TOKEN" > "$ENVF" )
  echo "✓ حُفظ ADMIN_TOKEN في $ENVF"
fi

echo "… بناء الحاوية (دقيقة أو دقيقتان)"
docker build -q -t uco-wa:latest "$REPO/whatsapp-service" >/dev/null
docker stop uco-wa >/dev/null 2>&1 && docker rm uco-wa >/dev/null 2>&1 || true
docker run -d --name uco-wa --restart unless-stopped --memory 256m \
  -p 127.0.0.1:$PORT:3001 --env-file "$ENVF" -v "$DATA":/data uco-wa:latest >/dev/null

for i in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    echo "✓ uco-wa يعمل على 127.0.0.1:$PORT"; break
  fi
  sleep 2
  [ "$i" = 20 ] && { echo "✗ الخدمة لم تستجب — آخر السجل:"; docker logs --tail 20 uco-wa 2>&1 | grep -v -i token; exit 1; }
done

# معلومات (بلا أسرار) لربط Caddy في الخطوة التالية
echo "--- caddy"
C=$(docker ps --format '{{.Names}}' | grep -i caddy | head -1 || true)
if [ -n "$C" ]; then
  docker inspect -f 'name={{.Name}} network={{.HostConfig.NetworkMode}} mounts={{range .Mounts}}{{.Source}}->{{.Destination}} {{end}}' "$C"
else
  echo "caddy ليس حاوية: $(command -v caddy || echo '?') $(systemctl is-active caddy 2>/dev/null || true)"
  ls -la /etc/caddy 2>/dev/null | head -5
fi
