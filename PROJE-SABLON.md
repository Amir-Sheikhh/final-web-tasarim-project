# PROJE-SABLON - GraphLink Social

## 1. Proje Adi ve Kisa Aciklama

GraphLink Social, Neo4j graph database kullanarak sosyal ag onerileri ureten bir web uygulamasidir. Kullanici, takip, gonderi, begeni ve oturum verileri node-edge-property mantigiyla tutulur.

## 2. Secilen Proje

- Kod: P39
- Ad: Neo4j Graph DB Sosyal Ag / Sosyal Ag Oneri Motoru
- Zorluk: Cok Zor
- Puan: 45p
- Temel teknoloji: Neo4j + Cypher Query + Node.js

## 3. Kullanilan Teknolojiler

- Node.js + Express
- Neo4j Community
- Cypher Query Language
- Neo4j Graph Data Science
- APOC
- Cytoscape.js
- JWT + HttpOnly Cookie
- Zod, Helmet, bcryptjs
- OpenAPI + Swagger UI

## 4. Temel Kavramlar

Graph database, veriyi tablo satirlari yerine node ve relationship olarak modeller. Bu projede `User` ve `Post` node'lari; `FOLLOWS`, `AUTHORED`, `LIKED` gibi relationship'ler vardir. Bu model sosyal ag sorgularinda cok sayida JOIN yerine graph traversal kullanmayi saglar.

## 5. Temel Ozellikler

- Kullanici kayit/giris/cikis
- Demo hesaplar
- Profil guncelleme
- Kullanici takip etme ve takipten cikma
- Gonderi olusturma, guncelleme, silme
- Begeni ve yorum akisi
- Bildirim merkezi
- Arkadasin arkadasi sorgulari
- Begeni ve iliski sinyallerine dayali oneriler
- Shortest path
- Louvain community detection
- PageRank liderleri
- FastRP embedding preview
- Cytoscape graph visualization
- Neo4j Browser ile veri inceleme

## 6. Mimari

Frontend statik HTML/CSS/JavaScript olarak `public/` klasorundedir. Backend Express API `src/server.js` ile baslar. Route dosyalari istekleri servis katmanina aktarir. Servis katmani Neo4j driver ile Cypher query calistirir. Graph algoritmalari destekleniyorsa GDS/APOC kullanilir; destek yoksa temel Cypher fallback davranisi kullanilir.

## 7. Veri Modeli

- `User`: kullanici profili, email, role, headline, city
- `Post`: gonderi metni, medya bilgisi, tarih
- `Session`: refresh token hash ve oturum suresi
- `FOLLOWS`: kullanicilar arasi takip iliskisi
- `AUTHORED`: kullanicinin yazdigi gonderiler
- `LIKED`: kullanicinin begendigi gonderiler
- `HAS_SESSION`: kullanici ve oturum iliskisi

## 8. Kurulum

```bash
npm install
cp .env.example .env
npm run neo4j:setup
npm run neo4j:start
npm run seed:graph
npm run dev
```

## 9. Calistirma

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde calisir.

## 10. API Dokumantasyonu

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI YAML: `http://localhost:3000/openapi.yaml`

## 11. Test

```bash
npm test
```

## 12. Zorluklar ve Cozumler

- GraphDB paradigmasi: Node-edge-property modeliyle cozuldu.
- Cypher ogrenme egrisi: Sorgular servis katmaninda okunabilir parcalara ayrildi.
- GDS/APOC plugin kurulumu: PowerShell scriptleriyle otomatiklestirildi.
- Auth guvenligi: JWT access + HttpOnly refresh cookie modeli kullanildi.

## 13. Ekran Goruntuleri

Ekran goruntuleri `screenshots/` klasorundedir.

## 14. Kaynaklar

Kaynaklar README ve final raporundaki kaynakca bolumunde listelenmistir.
