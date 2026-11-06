# Store listing

The App Store Connect texts for Unterwegs in German, English and Japanese, ready to paste. German is the source wording. Limits in brackets are Apple's character limits; every text here is within them (Japanese keywords also within 100 bytes). Open items and decisions: [STORE-RELEASE.md](STORE-RELEASE.md).

## Per language (App Information and the version page)

### Name [30] — App Information

Same in every language: **Unterwegs - Travel Log**

### Subtitle [30] — App Information

| Language | Text                           |
| -------- | ------------------------------ |
| de       | Reisepläne vom eigenen Server  |
| en       | Trip plans for your own server |
| ja       | 自分のサーバーで旅の計画       |

### Privacy Policy URL — App Information

| Language | URL                                                  |
| -------- | ---------------------------------------------------- |
| de       | https://doderich.github.io/unterwegs/de/privacy.html |
| en       | https://doderich.github.io/unterwegs/en/privacy.html |
| ja       | https://doderich.github.io/unterwegs/ja/privacy.html |

### Promotional Text [170] — version page

de:

```
Plane und ändere deine Reisen auf deinem eigenen AdventureLog-Server und hab jeden Tag, jeden Ort, jede Buchung und die Karte dabei, auch ohne Netz.
```

en:

```
Plan and change your trips on your own AdventureLog server, and keep every day, place, booking and map with you, even without a connection.
```

ja:

```
自分のAdventureLogサーバーで旅を計画・編集。毎日の予定、場所、予約、地図をオフラインでも持ち歩けます。
```

### Keywords [100] — version page

Comma-separated, no spaces after commas. Words from the name (Unterwegs, Travel, Log) count already and are left out. AdventureLog is also left out: Apple rejects other products' names in keywords; the description may name it.

| Language | Keywords                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------- |
| de       | Reiseplaner,Reise,Urlaub,offline,Reiseroute,Unterkunft,Karte,Self-Hosted,Tagesplan,Roadtrip,Buchung |
| en       | trip,planner,itinerary,offline,vacation,holiday,map,journey,lodging,booking,self-hosted,road trip   |
| ja       | 旅行,旅程,旅行計画,オフライン,地図,宿泊,予約,セルフホスト,旅のしおり                                |

### Support URL / Marketing URL — version page

| Language | Support URL                                          |
| -------- | ---------------------------------------------------- |
| de       | https://doderich.github.io/unterwegs/de/support.html |
| en       | https://doderich.github.io/unterwegs/en/support.html |
| ja       | https://doderich.github.io/unterwegs/ja/support.html |

Marketing URL is optional; leave it empty.

### What's New

Not shown for the first App Store version. From the next version on, it takes the release notes.

### Description [4000] — version page

de:

```
Unterwegs ist die Handy-App für AdventureLog, den Open-Source-Reiseplaner, den du auf deinem eigenen Server betreibst. Deine Reisen bleiben, wo sie hingehören: auf deinem Server und unterwegs bei dir.

DEINE REISE, AUCH OHNE NETZ
• Jede Sammlung liegt auf dem Handy: Tage, Orte, Unterkünfte, Verbindungen, Notizen und Checklisten
• PDFs, Fotos und Kartenbereiche vorher herunterladen; Tickets und Buchungen öffnen ohne Verbindung
• Die Tagesansicht zeigt, was als Nächstes kommt, jede Zeit in der Zeitzone vor Ort

PLANEN UND ÄNDERN
• Orte, Unterkünfte und Verbindungen anlegen und bearbeiten, Fotos und Dateien hinzufügen, den Tagesplan ordnen
• Eine ganze Reise durchsuchen, alle Orte auf einer Karte sehen, die Route in deiner Karten-App öffnen
• Sammlungen mit Mitreisenden teilen und Einladungen annehmen

ÜBER EINE REISE HINAUS
• Deine Orte, besuchte Länder und Regionen, Statistiken und ein Kalender
• Kategorien und Fotos aus Immich

DEIN SERVER, DEINE DATEN
• Anmelden per SSO, mit Benutzername und Passwort, mit dem QR-Code von der Website oder mit einem API-Schlüssel
• Nur HTTPS; der Schlüssel liegt im sicheren Speicher des Handys
• Keine Werbung, kein Tracking, kein Konto beim App-Entwickler

Unterwegs braucht einen AdventureLog-Server (getestet mit AdventureLog 0.13.1). Zum Ausprobieren bietet der Anmeldebildschirm den öffentlichen Demo-Server an. Unterwegs ist eine unabhängige App und kein offizielles Produkt von AdventureLog.
```

en:

```
Unterwegs is the phone app for AdventureLog, the open-source travel planner you run on your own server. Your trips stay where they belong: on your server, and with you on the road.

YOUR TRIP, EVEN OFFLINE
• Every collection is on your phone: days, places, lodging, transportation, notes and checklists
• Download PDFs, photos and map areas before you leave; tickets and bookings open without a connection
• The day view shows what's next, every time in the local time zone

PLAN AND CHANGE
• Create and edit places, lodging and transportation, add photos and files, arrange the day plan
• Search a whole trip, see every place on one map, open directions in your map app
• Share collections with fellow travellers and accept invitations

BEYOND ONE TRIP
• Your places, visited countries and regions, statistics and a calendar
• Categories and photos from Immich

YOUR SERVER, YOUR DATA
• Sign in with SSO, with username and password, with the QR code from the website or with an API key
• HTTPS only; the key stays in the phone's secure storage
• No ads, no tracking, no account with the app developer

Unterwegs needs an AdventureLog server (tested with AdventureLog 0.13.1). To try it, the sign-in screen offers the public demo server. Unterwegs is an independent app and not an official AdventureLog product.
```

ja:

```
Unterwegsは、自分のサーバーで動かすオープンソースの旅行プランナー「AdventureLog」のためのスマートフォンアプリです。旅のデータはあるべき場所に：あなたのサーバーと、旅先のあなたの手元に。

オフラインでも旅の予定を
• コレクションをまるごと端末に保存：日程、場所、宿泊、交通、メモ、チェックリスト
• PDF、写真、地図エリアを出発前にダウンロード。チケットや予約は通信なしで開けます
• 日ごとの表示で次の予定がひと目でわかり、時刻は現地のタイムゾーンで表示

計画も編集も
• 場所、宿泊、交通の作成と編集、写真やファイルの追加、日程の並べ替え
• 旅全体を検索、すべての場所をひとつの地図で確認、地図アプリで経路を開く
• 旅の仲間とコレクションを共有し、招待を受け取る

ひとつの旅を超えて
• 自分の場所、訪れた国と地域、統計、カレンダー
• カテゴリーとImmichの写真

自分のサーバー、自分のデータ
• SSO、ユーザー名とパスワード、ウェブサイトのQRコード、またはAPIキーでサインイン
• HTTPSのみ。キーは端末の安全な保管領域に保存
• 広告なし、トラッキングなし、アプリ開発者のアカウント不要

UnterwegsにはAdventureLogサーバーが必要です（AdventureLog 0.13.1で動作確認済み）。お試しには、サインイン画面から公開デモサーバーを選べます。Unterwegsは独立したアプリで、AdventureLogの公式製品ではありません。
```

### Screenshots

"iPhone with Dynamic Island (medium display)", the one iPhone slot App Store Connect asks for (1206 × 2622; it no longer offers a 6.9" slot). Six per language, order: home, plan, map, place, stays, login. Render them with `node scripts/store-screenshots/frame.mjs --platform ios --size 1206x2622` (output under `build/store-screens/ios-1206x2622/`, not committed). App Previews (up to three videos) are optional and left empty.

## Same for every language

| Field              | Value                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary category   | Travel                                                                                                                                                                         |
| Secondary category | Navigation                                                                                                                                                                     |
| Copyright          | `2026 <your name>`                                                                                                                                                             |
| Price              | Free                                                                                                                                                                           |
| Availability       | All countries; EU distribution needs the trader status ([STORE-RELEASE.md → App Store](STORE-RELEASE.md#5-app-store))                                                          |
| Content rights     | Yes, the app shows third-party content (OpenStreetMap map tiles under ODbL with attribution, Wikimedia images, content from the user's own server) and has the rights to do so |
| Version release    | Your choice; "Manually release this version" keeps control over the date                                                                                                       |

### Age rating

Answer **None / No** to every content question; the result is 4+. Notes for the questions that need thought:

- Unrestricted web access: No. The sign-in web view only shows the user's own server; other links open in the browser.
- User-generated content, messaging or chat with strangers: No. Content is the user's own and shared only with people on their own server.
- Advertising, gambling, loot boxes, in-app purchases: No.
- Age assurance or parental controls: No.

### App Privacy ("Data collection")

What the app sends to the developer's update server (privacy policy, section 3). Travel data, credentials and locations go only to the user's own server, which the developer doesn't control, so Apple doesn't count them as collected.

| Data type                                                                            | Collected | Linked to the user | Tracking | Purpose           |
| ------------------------------------------------------------------------------------ | --------- | ------------------ | -------- | ----------------- |
| Identifiers → Device ID (random installation ID)                                     | Yes       | No                 | No       | App Functionality |
| Diagnostics → Crash Data                                                             | Yes       | No                 | No       | App Functionality |
| Diagnostics → Other Diagnostic Data (start signal, device model, OS and app version) | Yes       | No                 | No       | App Functionality |

Everything else (contact info, location, user content, browsing, usage data, purchases): not collected.

### App Review Information

| Field            | Value                      |
| ---------------- | -------------------------- |
| Sign-in required | Yes                        |
| User name        | `demo`                     |
| Password         | `demo`                     |
| Contact          | Your name, phone and email |

Notes (English for Apple):

```
Unterwegs is a client for AdventureLog, an open-source travel planner that people host on their own server. The app has no server of its own; the user enters the address of their AdventureLog server.

To review: on the sign-in screen tap "Try the public demo" (demo.adventurelog.app, the public demo run by the AdventureLog project), then sign in with user name "demo" and password "demo". The demo server is public and its data may change.

Sign-in uses the user's own server (password, single sign-on configured on that server, QR code or API key), not a third-party social login, so Sign in with Apple is not required (guideline 4.8).

Camera is used to scan the sign-in QR code and to take photos for a trip; location is used only when the user creates a place at the current position.
```

## Google Play graphics

`node scripts/store-screenshots/feature-graphic.mjs` renders the 1024 × 500 feature graphic per language and the 512 × 512 icon into `build/store-screens/play/`. `node scripts/play-graphics.mjs --credentials <service-account.json> --package <id>` uploads them with the framed Android screenshots (`frame.mjs --platform android`) to every existing store listing, replacing the current images; a language needs its translation in the Play Console first. `--dry-run` lists what it would do.
