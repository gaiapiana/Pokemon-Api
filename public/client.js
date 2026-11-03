const socket = io();

const statoConnessione = document.getElementById("stato-connessione");
const erroreEl = document.getElementById("errore");
const schermoLobbyEl = document.getElementById("schermo-lobby");
const lobbyEl = document.getElementById("lobby");
const attesaEl = document.getElementById("attesa");
const partitaEl = document.getElementById("partita");
const battagliaEl = document.getElementById("battaglia");
const codiceCondivisione = document.getElementById("codice-condivisione");
const partitaTesto = document.getElementById("partita-testo");
const sceltaPokemonEl = document.getElementById("scelta-pokemon");
const attesaAvversarioEl = document.getElementById("attesa-avversario");
const esitoBattagliaEl = document.getElementById("esito-battaglia");
const attesaMossaEl = document.getElementById("attesa-mossa");
const registroMessaggiEl = document.getElementById("registro-messaggi");
const hudAvversarioEl = document.getElementById("hud-avversario");
const hudProprioEl = document.getElementById("hud-proprio");
const spriteAvversarioEl = document.getElementById("sprite-avversario");
const spriteProprioEl = document.getElementById("sprite-proprio");
const mosseGrigliaEl = document.getElementById("mosse-griglia");
const nomeInput = document.getElementById("nome");
const codiceInput = document.getElementById("codice");
const nomePokemonInput = document.getElementById("nome-pokemon");
const scegliPokemonBtn = document.getElementById("scegli-pokemon");

let mioNome = "";
let battagliaFinita = false;
const hpMaxPerGiocatore = new Map();

function escapeHtml(testo) {
  return String(testo)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function etichetta(nome) {
  return String(nome)
    .split("-")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function mostraErrore(messaggio) {
  erroreEl.textContent = messaggio;
  erroreEl.hidden = false;
}

function nascondiErrore() {
  erroreEl.textContent = "";
  erroreEl.hidden = true;
}

function mostraSezione(sezione) {
  const inBattaglia = sezione === "battaglia";
  document.body.classList.toggle("vista-lobby", !inBattaglia);
  document.body.classList.toggle("vista-battaglia", inBattaglia);
  schermoLobbyEl.hidden = inBattaglia;
  lobbyEl.hidden = sezione !== "lobby";
  attesaEl.hidden = sezione !== "attesa";
  partitaEl.hidden = sezione !== "partita";
  battagliaEl.hidden = !inBattaglia;
}

function pulsantiMosse() {
  return mosseGrigliaEl.querySelectorAll("button.mossa");
}

function impostaMosseAbilitate(abilitate) {
  pulsantiMosse().forEach((btn) => {
    btn.disabled = !abilitate;
  });
}

function classeBarra(percentuale) {
  if (percentuale > 50) return "hp-verde";
  if (percentuale >= 20) return "hp-giallo";
  return "hp-rosso";
}

function renderHud(dati) {
  const hpMax = dati.hpMax || dati.hp;
  const percentuale = hpMax > 0 ? Math.max(0, (dati.hp / hpMax) * 100) : 0;
  return `
    <p class="hud-nome">${escapeHtml(etichetta(dati.nome))}</p>
    <p class="hud-allenatore">${escapeHtml(dati.giocatore)}</p>
    <p class="hp">HP: ${dati.hp}/${hpMax}</p>
    <div class="hp-barra">
      <div class="hp-valore ${classeBarra(percentuale)}" style="width: ${percentuale}%"></div>
    </div>
  `;
}

function renderSprite(contenitore, url, nome) {
  contenitore.replaceChildren();
  if (!url) return;
  const img = document.createElement("img");
  img.src = url;
  img.alt = nome;
  img.className = "sprite";
  contenitore.appendChild(img);
}

function aggiornaHp(giocatore, hp) {
  const hud = document.querySelector(`.hud[data-giocatore="${CSS.escape(giocatore)}"]`);
  if (!hud) return;

  const hpMax = hpMaxPerGiocatore.get(giocatore) || hp;
  const percentuale = hpMax > 0 ? Math.max(0, (hp / hpMax) * 100) : 0;
  const testo = hud.querySelector(".hp");
  const barra = hud.querySelector(".hp-valore");
  if (testo) testo.textContent = `HP: ${hp}/${hpMax}`;
  if (barra) {
    barra.style.width = `${percentuale}%`;
    barra.classList.remove("hp-verde", "hp-giallo", "hp-rosso");
    barra.classList.add(classeBarra(percentuale));
  }
}

function animaColpo(giocatore) {
  const sprite = document.querySelector(`.sprite-box[data-giocatore="${CSS.escape(giocatore)}"] .sprite`);
  if (!sprite) return;
  sprite.classList.remove("colpito");
  void sprite.offsetWidth;
  sprite.classList.add("colpito");
}

function scorriRegistro() {
  registroMessaggiEl.scrollTop = registroMessaggiEl.scrollHeight;
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
  hpMaxPerGiocatore.clear();

  const mio = pokemon.find((p) => p.proprio);
  const avversario = pokemon.find((p) => !p.proprio);
  if (mio) mioNome = mio.giocatore;

  esitoBattagliaEl.hidden = true;
  esitoBattagliaEl.textContent = "";
  attesaMossaEl.hidden = true;
  registroMessaggiEl.replaceChildren();

  pokemon.forEach((p) => {
    hpMaxPerGiocatore.set(p.giocatore, p.hpMax || p.hp);
  });

  hudAvversarioEl.dataset.giocatore = avversario.giocatore;
  hudProprioEl.dataset.giocatore = mio.giocatore;
  spriteAvversarioEl.dataset.giocatore = avversario.giocatore;
  spriteProprioEl.dataset.giocatore = mio.giocatore;

  hudAvversarioEl.innerHTML = renderHud(avversario);
  hudProprioEl.innerHTML = renderHud(mio);
  renderSprite(spriteAvversarioEl, avversario.sprite, avversario.nome);
  renderSprite(
    spriteProprioEl,
    mio.spriteRetro || mio.sprite,
    mio.nome
  );

  mosseGrigliaEl.innerHTML = mio.mosse
    .map((mossa, indice) => {
      const testo = `${etichetta(mossa.nome)}`;
      const tipo = escapeHtml(mossa.tipo);
      return `<button type="button" class="mossa" data-tipo="${tipo}" data-indice="${indice}">
        <span class="mossa-nome">${escapeHtml(testo)}</span>
        <span class="mossa-info">${tipo} · ${mossa.potenza}</span>
      </button>`;
    })
    .join("");

  mostraSezione("battaglia");
});

socket.on("risultatoTurno", ({ hp, messaggi }) => {
  hp.forEach(({ giocatore, hp: valore }) => {
    const hud = document.querySelector(
      `.hud[data-giocatore="${CSS.escape(giocatore)}"] .hp`
    );
    const precedente = hud
      ? Number(hud.textContent.replace(/HP:\s*/, "").split("/")[0])
      : valore;
    aggiornaHp(giocatore, valore);
    if (valore < precedente) {
      animaColpo(giocatore);
    }
  });

  messaggi.forEach((testo) => {
    const riga = document.createElement("p");
    riga.textContent = testo;
    registroMessaggiEl.appendChild(riga);
  });
  scorriRegistro();

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

mosseGrigliaEl.addEventListener("click", (event) => {
  const bottone = event.target.closest("button.mossa");
  if (!bottone || battagliaFinita || bottone.disabled) return;

  const indice = Number(bottone.dataset.indice);
  impostaMosseAbilitate(false);
  attesaMossaEl.hidden = false;
  scorriRegistro();
  socket.emit("sceltaMossa", { indice });
});
