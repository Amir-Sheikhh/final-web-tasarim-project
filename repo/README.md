# repo/ - Projenin Kaynak Kodu

Bu GitHub repository'sinde proje kaynak kodu dogrudan repository kok dizininde tutulur. Bu nedenle kaynak kodu bu klasore kopyalanarak ikinci bir stale/eskimis kopya olusturulmamistir.

Degerlendirme icin kaynak kodu konumlari:

- Backend: [`../src/`](../src/)
- Frontend: [`../public/`](../public/)
- Testler: [`../test/`](../test/)
- Scriptler: [`../scripts/`](../scripts/)
- API ve rapor dokumanlari: [`../docs/`](../docs/)
- Docker/CI dosyalari: [`../Dockerfile`](../Dockerfile), [`../docker-compose.yml`](../docker-compose.yml), [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- Paket manifestleri: [`../package.json`](../package.json), [`../package-lock.json`](../package-lock.json)

Kisaca: bu klasor, teslim sablonundaki `repo/` beklentisi icin yonlendirme dosyasidir; calisan proje kaynak kodunun tek yetkili kopyasi repository kok dizinidir.
