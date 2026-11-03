# Pokémon Battle

Gioco di combattimento Pokémon per due giocatori, in tempo reale nel browser. Ogni allenatore crea o entra in una stanza, sceglie un Pokémon e sfida l’avversario a turni, con mosse, HP e sprite presi da [PokeAPI](https://pokeapi.co/).

## Tecnologie

- **Node.js** — runtime del server
- **Express** — server HTTP e file statici della cartella `public`
- **Socket.IO** — comunicazione in tempo reale tra client e server (lobby, scelta Pokémon, turni di battaglia)
- **PokeAPI** — dati dei Pokémon (statistiche, sprite, mosse, tipi e potenza)

## Installazione

Serve Node.js installato sul computer.

```bash
npm install
```

## Avvio

```bash
npm start
```

Il server ascolta su `http://localhost:3000` (oppure sulla porta indicata in `PORT`).

Apri quella indirizzo nel browser. Per giocare in due usa due schede, due browser o due dispositivi collegati allo stesso server.

## Come si gioca

1. Inserisci il tuo nome nella lobby **Pokémon Battle**.
2. **Crea stanza** per ottenere un codice di 4 lettere, oppure **Entra nella stanza** inserendo il codice di un amico. Ogni stanza ha al massimo 2 giocatori.
3. Quando entrambi sono connessi, ognuno sceglie un Pokémon scrivendone il nome (in inglese, come su PokeAPI: `pikachu`, `charizard`, `mr-mime`, …).
4. Il server scarica HP, attacco, difesa, velocità, sprite e 4 mosse con potenza. Se il nome non esiste puoi riprovare.
5. In battaglia vedi l’avversario in alto e il tuo Pokémon in basso. Clicca una delle 4 mosse: attacca per primo chi ha più velocità (a parità, a caso).
6. I danni riducono gli HP; il registro in basso racconta il turno. A 0 HP la partita finisce: **Hai vinto!** o **Hai perso!**.

## Struttura dei file

```
pokemon/
├── server.js          # Server Express + Socket.IO: stanze, PokeAPI, logica di combattimento
├── package.json       # Dipendenze e script npm start
├── README.md
└── public/
    ├── index.html     # Pagina: lobby, scelta Pokémon e campo di battaglia
    ├── client.js      # Client Socket.IO e interfaccia
    └── style.css      # Stile della lobby e della battaglia
```
