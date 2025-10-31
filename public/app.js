const btn = document.getElementById("generateBtn");
const out = document.getElementById("result");
const loader = document.getElementById("loader");

document.getElementById("themeToggle").onclick = () =>
  document.body.classList.toggle("dark");

async function callAI(prompt, key) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [{role:"system",content:"Assistant batch cooking sportif"}, {role:"user",content:prompt}],
      temperature: 0.4,
      max_output_tokens: 8000,
      text:{format:{type:"plain_text"}}
    })
  });
  const j = await res.json();
  return j.output_text;
}

btn.onclick = async () => {
  const key = document.getElementById("apiKey").value.trim();
  if(!key) return alert("Mets ta clé API 🙏");

  loader.classList.remove("hidden");
  out.textContent = "";

  const planning = document.getElementById("planning").value;
  const data = {
    gTho: gTho.value, gAna: gAna.value,
    pTho: pTho.value, pAna: pAna.value,
    lTho: lTho.value, lAna: lAna.value,
    rTho: rTho.value, rAna: rAna.value,
    matos: matos.value,
    placard: placard.value,
  }

  const prompt = `
Tu es un expert batch cooking SPORT pour 2 personnes (Thomas prise de masse, Anaïs sèche).
Produis 3 recettes max sportives, équilibrées, compatibles matériel & placard.

Données:
Planning:\n${planning}

Quantités par repas (cru):
Thomas G:${data.gTho}g P:${data.pTho}g L:${data.lTho}g
Anaïs   G:${data.gAna}g P:${data.pAna}g L:${data.lAna}g

Repas total:
Thomas: ${data.rTho}
Anaïs: ${data.rAna}

Matériel dispo : ${data.matos}
Placard dispo : ${data.placard}

Sortie très structurée:
- Titre
- Portions T/A
- Ingrédients (en g/ml/unité)
- Étapes plat + sauce
- Calories/personne
- Liste de courses globale

Style cuisine variée (pas que asiatique)
Toujours healthy, riche protéines, huiles contrôlées
`;

  const r = await callAI(prompt, key);
  loader.classList.add("hidden");
  out.textContent = r;
}
