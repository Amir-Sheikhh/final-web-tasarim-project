# GraphLink Final Proje Raporu

Bu dosya, repo degerlendirme sablonunda beklenen markdown rapor girisidir. Tam ve resmi Word raporu su dosyalardadir:

- [PROJE-RAPORU-SABLON.docx](PROJE-RAPORU-SABLON.docx)
- [docs/GraphLink_Final_Raporu.docx](docs/GraphLink_Final_Raporu.docx)

## 1. Giris

GraphLink, Neo4j graph database uzerinde calisan bir sosyal ag demosudur. Proje; kullanici, takip, gonderi, begeni, yorum, mesaj ve oturum verilerini graph modeliyle temsil eder.

## 2. Gereksinim Analizi - PRD

Proje MVP kapsami; kayit/giris, demo hesaplar, profil, follow/unfollow, post/comment/like, mesajlasma, bildirimler, graph dashboard ve OpenAPI dokumantasyonunu kapsar.

## 3. Piyasa ve Rekabet Analizi

Rapor; Neo4j Aura/Bloom, Kumu ve Linkurious gibi graph odakli araclarla karsilastirma, SWOT analizi ve konumlandirma aciklamasi icerir.

## 4. Teknoloji Yigini (Tech Stack)

- Database: Neo4j 5 Community, Cypher, APOC, Graph Data Science
- Backend: Node.js, Express, neo4j-driver
- Frontend: HTML, CSS, Vanilla JavaScript, Cytoscape.js
- Auth: JWT access token + HttpOnly refresh cookie
- Test: node --test, Supertest, c8, ESLint
- Deployment: Docker Compose veya yerel Neo4j runtime

## 5. Sistem Mimarisi

Mimari; tarayici istemcisi, Express API ve Neo4j runtime katmanlarindan olusur. C4 context/container diyagramlari `docs/report-assets/` ve `docs/diagrams/` altinda bulunur.

## 6. Veri Modeli ve API Tasarimi

Graph modelinde `User`, `Post`, `Comment`, `Message`, `Session` ve `Group` node tipleri; `FOLLOWS`, `AUTHORED`, `LIKED`, `COMMENTED`, `SENT`, `TO`, `HAS_SESSION` gibi iliskiler kullanilir.

OpenAPI dosyasi: [docs/openapi.yaml](docs/openapi.yaml)

## 7. Kullanici Arayuzu Tasarimi

Arayuz; landing/auth, dashboard, people, posts, messages, notifications ve graph analiz panellerinden olusur. Ekran goruntuleri [screenshots/](screenshots/) klasorundedir.

## 8. Guvenlik, Performans ve Test

Guvenlik katmani; Helmet CSP, Zod validation, express-rate-limit, bcrypt password hashing, JWT, HttpOnly cookie ve refresh-token rotation kullanir.

Test komutlari:

```bash
npm test
npm run test:coverage
npm run lint
npm run check:status
```

CI; GitHub Actions uzerinde Neo4j service, seed, lint, audit ve coverage adimlarini calistirir.

## 9. Maliyet, Gelir Modeli ve GTM

Resmi Word raporu, GraphLink'in egitim/demo odakli mikro SaaS olarak nasil paketlenebilecegini varsayimsal olarak inceler.

## 10. Uygulama ve Gelistirme

Kurulum:

```bash
git clone https://github.com/Amir-Sheikhh/final-web-tasarim-project.git
cd final-web-tasarim-project
npm install
cp .env.example .env
npm run neo4j:setup
npm run neo4j:start
npm run seed:graph
npm run dev
```

Uygulama: `http://localhost:3000`

## 11. Sonuc ve Degerlendirme

GraphLink, final teslimi icin calisir bir full-stack sosyal graph demosu sunar. Proje; kaynak kod, test, CI, Docker, OpenAPI, ekran goruntuleri, sunum ve DOCX rapor ile birlikte paketlenmistir.

## Kaynakca

Tam kaynakca, IEEE formatinda [docs/GraphLink_Final_Raporu.docx](docs/GraphLink_Final_Raporu.docx) icinde yer alir.
