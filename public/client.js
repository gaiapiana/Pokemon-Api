const socket = io();

const statoConnessione = document.getElementById("stato-connessione");
const erroreEl = document.getElementById("errore");
const lobbyEl = document.getElementById("lobby");
const attesaEl = document.getElementById("attesa");
const partitaEl = document.getElementById("partita");
const battagliaEl = document.getElementById("battaglia");
const codiceCondivisione = document.getElementById("codice-condivisione");
const partitaTesto = document.getElementById("partita-testo");
const sceltaPokemonEl = document.getElementById("scelta-pokemon");
const attesaAvversarioEl = document.getElementById("attesa-avversario");
const pokemonBattagliaEl = document.getElementById("pokemon-battaglia");
const esitoBattagliaEl = document.getElementById("esito-battaglia");
const attesaMossaEl = document.getElementById("attesa-mossa");
const registroMessaggiEl = document.getElementById("registro-messaggi");
const nomeInput = document.getElementById("nome");
const codiceInput = document.getElementById("codice");
const nomePokemonInput = document.getElementById("nome-pokemon");
const scegliPokemonBtn = document.getElementById("scegli-pokemon");

let mioNome = "";
let battagliaFinita = false;

function mostraErrore(messaggio) {
  erroreEl.textContent = messaggio;
  erroreEl.hidden = false;
}

function nascondiErrore() {
  erroreEl.textContent = "";
  erroreEl.hidden = true;
}

function mostraSezione(sezione) {
  lobbyEl.hidden = sezione !== "lobby";
  attesaEl.hidden = sezione !== "attesa";
  partitaEl.hidden = sezione !== "partita";
  battagliaEl.hidden = sezione !== "battaglia";
}

function pulsantiMosse() {
  return pokemonBattagliaEl.querySelectorAll("button.mossa[data-proprio='true']");
}

function impostaMosseAbilitate(abilitate) {
  pulsantiMosse().forEach((btn) => {
    btn.disabled = !abilitate;
  });
}

function renderPokemon(dati) {
  const mosse = dati.mosse
    .map((mossa, indice) => {
      const testo = `${mossa.nome} (${mossa.tipo}, potenza ${mossa.potenza})`;
      if (!dati.proprio) {
        return `<p>${testo}</p>`;
      }
      return `<button type="button" class="mossa" data-proprio="true" data-indice="${indice}">${testo}</button>`;
    })
    .join("");

  return `
    <article data-giocatore="${dati.giocatore}">
      <h2>${dati.nome}</h2>
      <p>${dati.giocatore}</p>
      ${dati.sprite ? `<img src="${dati.sprite}" alt="${dati.nome}" />` : ""}
      <p class="hp">HP: ${dati.hp}</p>
      <div>${mosse}</div>
    </article>
  `;
}

socket.on("connect", () => {
  statoConnessione.textContent = "Connesso";
});

socket.on("disconnect", () => {
  statoConnessione.textContent = "Disconnesso";
});

socket.on("errore", ({ messaggio }) => {
  mostraErrore(messaggio);
  scegliPokemonBtn.disabled = false;
});

socket.on("inAttesa", ({ codice }) => {
  nascondiErrore();
  codiceCondivisione.textContent = codice;
  sceltaPokemonEl.hidden = false;
  attesaAvversarioEl.hidden = true;
  scegliPokemonBtn.disabled = false;
  battagliaFinita = false;
  mostraSezione("attesa");
});

socket.on("partitaPronta", ({ giocatori }) => {
  nascondiErrore();
  const [nome1, nome2] = giocatori;
  partitaTesto.textContent = `Partita pronta: ${nome1} vs ${nome2}`;
  sceltaPokemonEl.hidden = false;
  attesaAvversarioEl.hidden = true;
  scegliPokemonBtn.disabled = false;
  nomePokemonInput.value = "";
  mostraSezione("partita");
});

socket.on("pokemonScelto", () => {
  nascondiErrore();
  sceltaPokemonEl.hidden = true;
  attesaAvversarioEl.hidden = false;
});

socket.on("battagliaPronta", ({ pokemon }) => {
  nascondiErrore();
  battagliaFinita = false;
  const mio = pokemon.find((p) => p.proprio);
  if (mio) mioNome = mio.giocatore;
  esitoBattagliaEl.hidden = true;
  esitoBattagliaEl.textContent = "";
  attesaMossaEl.hidden = true;
  registroMessaggiEl.replaceChildren();
  pokemonBattagliaEl.innerHTML = pokemon.map(renderPokemon).join("");
  mostraSezione("battaglia");
});

socket.on("risultatoTurno", ({ hp, messaggi }) => {
  hp.forEach(({ giocatore, hp: valore }) => {
    const scheda = pokemonBattagliaEl.querySelector(
      `article[data-giocatore="${CSS.escape(giocatore)}"] .hp`
    );
    if (scheda) scheda.textContent = `HP: ${valore}`;
  });

  messaggi.forEach((testo) => {
    const riga = document.createElement("p");
    riga.textContent = testo;
    registroMessaggiEl.appendChild(riga);
  });

  if (hp.some((stato) => stato.hp <= 0)) {
    battagliaFinita = true;
  }

  attesaMossaEl.hidden = true;
  if (!battagliaFinita) {
    impostaMosseAbilitate(true);
  }
});

socket.on("fineBattaglia", ({ vincitore }) => {
  battagliaFinita = true;
  impostaMosseAbilitate(false);
  attesaMossaEl.hidden = true;
  esitoBattagliaEl.textContent =
    vincitore === mioNome ? "Hai vinto!" : "Hai perso!";
  esitoBattagliaEl.hidden = false;
});

document.getElementById("crea-stanza").addEventListener("click", () => {
  nascondiErrore();
  mioNome = nomeInput.value.trim();
  socket.emit("creaStanza", { nome: nomeInput.value });
});

document.getElementById("entra-stanza").addEventListener("click", () => {
  nascondiErrore();
  mioNome = nomeInput.value.trim();
  socket.emit("entraStanza", {
    nome: nomeInput.value,
    codice: codiceInput.value,
  });
});

scegliPokemonBtn.addEventListener("click", () => {
  nascondiErrore();
  scegliPokemonBtn.disabled = true;
  socket.emit("scegliPokemon", { nome: nomePokemonInput.value });
});

pokemonBattagliaEl.addEventListener("click", (event) => {
  const bottone = event.target.closest("button.mossa[data-proprio='true']");
  if (!bottone || battagliaFinita || bottone.disabled) return;

  const indice = Number(bottone.dataset.indice);
  impostaMosseAbilitate(false);
  attesaMossaEl.hidden = false;
  socket.emit("sceltaMossa", { indice });
});
