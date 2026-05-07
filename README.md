# GraphLink Social - Neo4j Graph DB Sosyal Ag

BMU1208 Web Tabanli Programlama final projesi. GraphLink, Neo4j graph database uzerinde kullanici, takip, gonderi, begeni, yorum ve oturum verilerini modelleyen full-stack bir sosyal ag onerisi demosudur.

## Demo / Ekran Goruntuleri

Ekran goruntuleri `screenshots/` klasorundedir.

![Landing](screenshots/landing.png)
![Dashboard](screenshots/dashboard.png)
![Graph Panel](screenshots/graph-panel.png)

## Kullanilan Teknolojiler

- Backend: Node.js, Express, neo4j-driver
- Database: Neo4j Community, Cypher Query Language
- Graph algoritmalari: Neo4j Graph Data Science, APOC
- Frontend: HTML, CSS, Vanilla JavaScript, Cytoscape.js
- Auth: JWT access token + HttpOnly refresh cookie
- Security / validation: Helmet, cookie-parser, Zod, bcryptjs, rate limiting
- API dokumantasyonu: OpenAPI 3.1 + Swagger UI
- Test: Node test runner, Supertest

## Kurulum Adimlari

1. Repoyu klonlayin.

```bash
git clone https://github.com/Amir-Sheikhh/final-web-tasarim-project.git
cd final-web-tasarim-project
```

2. Bagimliliklari kurun.

```bash
npm install
```

3. Ortam dosyasini hazirlayin.

```bash
cp .env.example .env
```

4. Neo4j runtime kurulumunu hazirlayin.

```bash
npm run neo4j:setup
```

5. Neo4j'i baslatin.

```bash
npm run neo4j:start
```

6. Demo graph verisini yukleyin.

```bash
npm run seed:graph
```

## Nasil Calistirilir

```bash
npm run dev
```

Uygulama: `http://localhost:3000`

API dokumantasyonu:

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI YAML: `http://localhost:3000/openapi.yaml`
- Neo4j Browser: `http://127.0.0.1:7474`

Test:

```bash
npm test
```

Neo4j calismiyorsa database entegrasyon testleri otomatik olarak skip edilir; validation ve security unit testleri calisir.

## Proje Yapisi

```text
src/
  server.js              Express app ve route baglantilari
  config.js              Ortam degiskenleri ve rate limit ayarlari
  db/                    Neo4j driver, seed ve constraint islemleri
  middleware/            Auth, validation, rate limit, request logger
  routes/                Auth, social, graph ve monitoring endpointleri
  services/              Auth, sosyal ag ve graph query is kurallari
  validation/            Zod semalari
public/                  Frontend HTML, CSS, JS ve statik assetler
docs/                    Final raporu, OpenAPI, ADR, diyagramlar
screenshots/             Demo ekran goruntuleri
scripts/                 Neo4j kurulum/baslatma ve rapor uretimi
test/                    Unit ve integration testleri
```

## One Cikan Ozellikler

- Neo4j property graph modeli: `User`, `Post`, `Session` node tipleri.
- Iliski modeli: `FOLLOWS`, `AUTHORED`, `LIKED`, `HAS_SESSION`, yorum ve bildirim akislari.
- Arkadasin arkadasi sorgulari: 2-hop traversal ile ikinci derece baglantilar.
- Iliski tabanli oneriler: mutual connection, takip ve begeni sinyallerinden aciklanabilir oneriler.
- Benzer icerik mantigi: kullanicinin begendigi gonderilerden ve benzer sosyal sinyallerden feed/recommendation uretimi.
- Graph analizi: Louvain community, PageRank, FastRP embedding preview, shortest path.
- Cytoscape.js ile web icinde network gorsellestirme.
- Neo4j Browser ile graph verisini ayrica inceleme.
- JWT auth, refresh rotation, logout session revoke.
- OpenAPI 3.1 dokumantasyonu ve Swagger UI.

## Karsilasilan Zorluklar ve Cozumler

- Graph DB paradigmasi: SQL tablolari yerine node-edge-property modeli kuruldu. Sosyal ag icin iliskiler dogrudan graph relationship olarak tasarlandi.
- Cypher sorgulari: Arkadasin arkadasi, mutual connection ve recommendation sorgulari servis katmaninda parcalanarak okunabilir hale getirildi.
- GDS/APOC kurulumu: Yerel Neo4j runtime icin PowerShell setup scriptleri eklendi.
- Auth guvenligi: Tokenlar localStorage yerine HttpOnly cookie ile tutuldu; refresh token hashlenerek Neo4j session node'unda saklandi.
- Demo tekrarlanabilirligi: `npm run seed:graph` komutu ile ayni graph verisi tekrar uretilebilir hale getirildi.

## Kaynaklar

- Neo4j Documentation: https://neo4j.com/docs/
- Cypher Manual: https://neo4j.com/docs/cypher-manual/current/
- Neo4j Graph Data Science: https://neo4j.com/docs/graph-data-science/current/
- APOC Documentation: https://neo4j.com/docs/apoc/current/
- Cytoscape.js Documentation: https://js.cytoscape.org/
- Express Documentation: https://expressjs.com/
- OWASP Top 10: https://owasp.org/Top10/
- OpenAPI Specification: https://spec.openapis.org/oas/latest.html

## Lisans

MIT. Ayrinti icin `LICENSE` dosyasina bakiniz.
