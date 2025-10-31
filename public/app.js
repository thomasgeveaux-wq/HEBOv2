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
Tu es un assistant de batch cooking SPORTIF pour Thomas et Anaïs.
RÈGLES:
- Sortie STRICTEMENT JSON, pas de texte autour.
- Respecte EXACTEMENT les PORTIONS par recette (Thomas/Anaïs) données.
- Atteins les cibles G/V/L avec une source de glucides VISIBLE si G>200g (riz/pâtes/quinoa/boulgour/semoule/pdt/patate douce/…).
- Cuisine orientée sport: protéines maigres, légumes abondants, G complexes, peu d'AG ajoutés.
- Limite huile: max ~15 ml pour 2 portions, 20 ml pour 3, 30 ml pour 4 (répartis entre cuisson + sauce).
- Matériel interdit → proposer alternative compatible.
- Évite les ingrédients/allergènes interdits.
- Diversité cuisine (méditerranée/asia/bistrot/tex-mex/mex/indien/italien/japonais/chinois/thai/vietnamien/coréen/grec/libanais/turc/marocain/tunisien/algérien/espagnol/portugais/argentin/brésilien/péruvien/colombien/américain/cajun-creole/soul food/bbq/hawaïen-poke/caraïbes/africain/éthiopien/sénégalais/sud-africain/fusion/gastro/street-food/healthy/vegan/veggie/gluten-free/raw food/tapas/ramen/sushi/noodle bar/pizza/pâtes/burger/steakhouse/seafood/brunch/rotisserie/traiteur/fait-maison/local/bistro-chic/oriental/indonésien/malaisien/philippin/népalais/pakistanais/israélien/kosher/halal/nordique/scandinave/allemand/british/irlandais/belge/suisse/autrichien/russe/polonais/ukrainien/balkan/roumain/hongrois/kebab/sandwicherie/coffee shop/food-court/farm-to-table…).
- Étapes: pas plus de 10-12, temps & feu & textures.
- Utilise de préférence les produits listés dans le Placard si cohérents.

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
