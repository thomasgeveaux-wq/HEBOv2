// PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(console.error);
}

/* ================= STATE ================= */
const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const STORAGE_KEY = 'hebo_state_v61_tabs';

let state = {
  apiKey: '',
  model: 'gpt-4.1-mini',
  maxTokens: 12000,
  matos: 'poêle, casserole, four, blender, wok',
  envies: '',
  autres: '',
  placard: '',
  profiles: [
    {name:'Thomas', G:100, P:200, V:150},
    {name:'Anaïs',  G:50,  P:100, V:250}
  ],
  // planning[day][meal].enabled + planning[day][meal].who[name]=true/false
  planning: {}
};

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  try{ state = {...state, ...JSON.parse(raw)}; }catch(_){}
}

/* =============== TABS =============== */
const tabs = Array.from(document.querySelectorAll('.tab'));
const panels = {
  planning: document.getElementById('tab-planning'),
  profils: document.getElementById('tab-profils'),
  materiel: document.getElementById('tab-materiel'),
  params: document.getElementById('tab-params')
};

tabs.forEach(t=>{
  t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const target = t.dataset.tab;
    Object.entries(panels).forEach(([k,el])=>{
      if(k===target){ el.hidden=false; el.classList.add('active'); }
      else { el.hidden=true; el.classList.remove('active'); }
    });
  });
});

/* =============== UI HOOKS =============== */
const el = (sel)=>document.querySelector(sel);
const apiKeyEl = el('#apiKey');
const modelEl = el('#model');
const maxTokensEl = el('#maxTokens');
const matosEl = el('#matos');
const enviesEl = el('#envies');
const autresEl = el('#autres');
const placardEl = el('#placard');

const profilesListEl = el('#profilesList');
const addProfileBtn = el('#addProfileBtn');
const pNameEl = el('#pName'); const pGEl = el('#pG'); const pPEl = el('#pP'); const pVEl = el('#pV');

const planningTable = el('#planningTable');
const generateBtn = el('#generateBtn');
const statusEl = el('#status');
const resultsEl = el('#results');
const exportBtn = el('#exportBtn');

// Install prompt (PWA)
let deferredPrompt = null;
const installBtn = el('#installBtn');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn?.classList?.remove('hidden'); });
installBtn?.addEventListener('click', async () => {
  if(!deferredPrompt) return;
  deferredPrompt.prompt(); deferredPrompt = null;
});

/* =============== INIT =============== */
load();
initPlanningState();   // must be before rendering
mountConfig();
renderProfiles();
renderPlanning();

/* =============== CONFIG BINDINGS =============== */
function mountConfig(){
  apiKeyEl.value = state.apiKey || '';
  modelEl.value = state.model || 'gpt-4.1-mini';
  maxTokensEl.value = state.maxTokens || 12000;
  matosEl.value = state.matos || '';
  enviesEl.value = state.envies || '';
  autresEl.value = state.autres || '';
  placardEl.value = state.placard || '';

  apiKeyEl.addEventListener('input', ()=>{ state.apiKey = apiKeyEl.value.trim(); save(); });
  modelEl.addEventListener('change', ()=>{ state.model = modelEl.value; save(); });
  maxTokensEl.addEventListener('change', ()=>{ state.maxTokens = Number(maxTokensEl.value)||12000; save(); });
  matosEl.addEventListener('input', ()=>{ state.matos = matosEl.value; save(); });
  enviesEl.addEventListener('input', ()=>{ state.envies = enviesEl.value; save(); });
  autresEl.addEventListener('input', ()=>{ state.autres = autresEl.value; save(); });
  placardEl.addEventListener('input', ()=>{ state.placard = placardEl.value; save(); });

  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hebo-state.json';
    a.click();
  });
}

/* =============== PROFILES =============== */
function renderProfiles(){
  profilesListEl.innerHTML = '';
  state.profiles.forEach(p=>{
    const div = document.createElement('div');
    div.className = 'profile-item';
    div.innerHTML = `
      <div>
        <div><b>${p.name}</b></div>
        <div class="mini">G:${p.G}g • P:${p.P}g • V:${p.V}g par portion</div>
      </div>
      <div class="actions">
        <button class="btn ghost" data-edit="${p.name}">Éditer</button>
        <button class="btn ghost" data-del="${p.name}">Suppr</button>
      </div>`;
    profilesListEl.appendChild(div);
  });
  profilesListEl.querySelectorAll('[data-edit]').forEach(b=>{
    b.onclick = ()=>{
      const n = b.dataset.edit;
      const p = state.profiles.find(x=>x.name===n);
      if(!p) return;
      pNameEl.value = p.name; pGEl.value = p.G; pPEl.value = p.P; pVEl.value = p.V;
    };
  });
  profilesListEl.querySelectorAll('[data-del]').forEach(b=>{
    b.onclick = ()=>{
      const n = b.dataset.del;
      state.profiles = state.profiles.filter(x=>x.name!==n);
      // purge planning selections for removed profile
      DAYS.forEach(d=>['lunch','dinner'].forEach(m=>{
        if(state.planning[d][m].who) delete state.planning[d][m].who[n];
      }));
      save(); renderProfiles(); renderPlanning();
    };
  });
}

addProfileBtn.addEventListener('click', (e)=>{
  e.preventDefault();
  const name = (pNameEl.value||'').trim();
  if(!name) return;
  const G = Number(pGEl.value)||0, P = Number(pPEl.value)||0, V = Number(pVEl.value)||0;
  const idx = state.profiles.findIndex(x=>x.name===name);
  const obj = {name,G,P,V};
  if(idx>-1) state.profiles[idx]=obj; else state.profiles.push(obj);
  save(); renderProfiles(); renderPlanning();
});

/* =============== PLANNING =============== */
function initPlanningState(){
  if (Object.keys(state.planning||{}).length) return;
  DAYS.forEach(d=>{
    state.planning[d] = {
      lunch:  { enabled:false, who:{} },
      dinner: { enabled:false, who:{} }
    };
  });
  save();
}

function renderPlanning(){
  // ensure who objects contain only known profiles
  DAYS.forEach(d=>['lunch','dinner'].forEach(m=>{
    const who = state.planning[d][m].who || {};
    const allowed = new Set(state.profiles.map(p=>p.name));
    Object.keys(who).forEach(k=>{ if(!allowed.has(k)) delete who[k]; });
    state.planning[d][m].who = who;
  }));

  const profs = state.profiles.map(p=>p.name);
  let thead = `
    <thead>
      <tr>
        <th class="day">Jour</th>
        <th class="meal">Repas</th>
        <th>Actif</th>
        ${profs.map(n=>`<th>${n}</th>`).join('')}
        <th>Résumé</th>
      </tr>
    </thead>`;
  let tbody = `<tbody>`;
  DAYS.forEach(day=>{
    // day header row
    tbody += `<tr><th class="day" colspan="${4+profs.length}">${day}</th></tr>`;
    ['lunch','dinner'].forEach(meal=>{
      const slot = state.planning[day][meal];
      const label = meal==='lunch'?'Midi':'Dîner';
      const summary = Object.entries(slot.who||{}).filter(([,v])=>!!v).map(([n])=>n).join(' · ') || '<span class="muted">—</span>';
      tbody += `
        <tr>
          <td class="meal">${label}</td>
          <td><input type="checkbox" data-day="${day}" data-meal="${meal}" data-kind="enabled" ${slot.enabled?'checked':''}></td>
          ${profs.map(n=>{
            const checked = slot.who?.[n] ? 'checked' : '';
            return `<td><input type="checkbox" data-day="${day}" data-meal="${meal}" data-kind="who" data-name="${n}" ${checked}></td>`;
          }).join('')}
          <td>${summary}</td>
        </tr>`;
    });
  });
  tbody += `</tbody>`;

  planningTable.innerHTML = thead + tbody;

  // Bind checkboxes
  planningTable.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
    cb.onchange = ()=>{
      const d = cb.dataset.day, m = cb.dataset.meal, kind = cb.dataset.kind;
      if(kind==='enabled'){
        state.planning[d][m].enabled = cb.checked;
      } else if(kind==='who'){
        if(!state.planning[d][m].who) state.planning[d][m].who = {};
        state.planning[d][m].who[cb.dataset.name] = cb.checked;
        // auto-enable if someone is selected
        if (cb.checked) state.planning[d][m].enabled = true;
      }
      save(); renderPlanning();
    };
  });
}

/* =============== PROMPT “VENÈRE ++” BUILDER =============== */
function buildPromptPayload(){
  // Build TSV from planning
  const lines = [];
  DAYS.forEach(day=>{
    ['lunch','dinner'].forEach(meal=>{
      const slot = state.planning[day][meal];
      if(!slot.enabled) return;
      const who = Object.entries(slot.who||{}).filter(([,v])=>!!v).map(([n])=>n);
      if(!who.length) return; // ignore empty
      lines.push([day, (meal==='lunch'?'Midi':'Dîner'), who.join(', ')].join('\t'));
    });
  });
  const inputTSV = lines.join('\n') || '(aucun)';

  // Profiles → perMeal map
  const perMeal = {};
  state.profiles.forEach(p=>{
    perMeal[p.name] = {
      glucides_g_cru: p.G,
      viandes_poissons_g_cru: p.P,
      legumes_g_cru: p.V
    };
  });

  // Each active meal = 1 recipe target (strict portions == 1 portion par profil présent)
  const chunkTargets = [];
  (lines||[]).forEach(L=>{
    const who = (L.split('\t')[2]||'').split(',').map(s=>s.trim()).filter(Boolean);
    const portions = {};
    who.forEach(w=>{ portions[w]= (portions[w]||0)+1; });

    const targets = {glucides_g_cru:0, viandes_poissons_g_cru:0, legumes_g_cru:0};
    Object.entries(portions).forEach(([name,n])=>{
      const p = perMeal[name]; if(!p) return;
      targets.glucides_g_cru         += p.glucides_g_cru * n;
      targets.viandes_poissons_g_cru += p.viandes_poissons_g_cru * n;
      targets.legumes_g_cru          += p.legumes_g_cru * n;
    });

    chunkTargets.push({ portions, targets });
  });

  // Config/contraintes
  const cfg = {
    allowed: (state.matos||'').split(',').map(s=>s.trim()).filter(Boolean),
    banned: [],
    likesPrompt: state.envies||'',
    cuisines: [],
    avoid: (state.autres.match(/eviter|éviter\s*:\s*([^;\n]+)/i)?.[1]||'').split(',').map(x=>x.trim()).filter(Boolean),
    allergens: (state.autres.match(/allergies\s*:\s*([^;\n]+)/i)?.[1]||'').split(',').map(x=>x.trim()).filter(Boolean),
    placard: state.placard||''
  };

  const allowedTxt = cfg.allowed.join(', ');
  const bannedTxt = cfg.banned.join(', ') || '(aucun)';
  const cuisinesTxt = cfg.cuisines.join(', ') || '(libre)';
  const avoidTxt = cfg.avoid.join(', ') || '(rien)';
  const allergensTxt = cfg.allergens.join(', ') || '(aucune)';
  const placardTxt = cfg.placard ? `\nPlacard (à utiliser en priorité si pertinent) : ${cfg.placard}` : '';
  const likesTxt = cfg.likesPrompt ? `\nEnvies particulières : ${cfg.likesPrompt}` : '';

  const portionsLines = chunkTargets.map((rt,i)=> {
    const k = Object.entries(rt.portions).map(([n,v])=>`${n}=${v}`).join(', ');
    return `R${i+1}: ${k}`;
  }).join('\n');
  const targetsLines = chunkTargets.map((rt,i)=>`R${i+1}: G=${rt.targets.glucides_g_cru}, V=${rt.targets.viandes_poissons_g_cru}, L=${rt.targets.legumes_g_cru}`).join('\n');

  const system = `
Tu es un assistant de batch cooking SPORTIF pour Thomas et Anaïs (et profils ajoutés).
RÈGLES:
- Sortie STRICTEMENT JSON, pas de texte autour.
- Respecte EXACTEMENT les PORTIONS par recette (pour chaque profil).
- Atteins les cibles G/V/L avec une source de glucides VISIBLE si G>200g (riz/pâtes/quinoa/boulgour/semoule/pdt/patate douce/…).
- Cuisine orientée sport: protéines maigres, légumes abondants, G complexes, peu d'AG ajoutés.
- Limite huile: ~15 ml (2 portions), 20 ml (3), 30 ml (4).
- Matériel interdit → proposer alternative compatible.
- Évite les ingrédients/allergènes interdits.
- Diversité cuisine (méditerranée/asia/bistrot/tex-mex/indien/italien/japonais/chinois/thai/vietnamien/coréen/grec/libanais/turc/marocain/tunisien/algérien/espagnol/portugais/argent./brés./péruv./colomb./améric./cajun/soul/bbq/hawaïen/caraïbes/africain/éthiopien/sénégalais/sud-africain/fusion/healthy/veggie/GF/raw/ramen/sushi/noodle bar/pizza/pâtes/burger/steakhouse/seafood/brunch/rotisserie...).
- Étapes: ≤ 10-12, avec temps & feu & textures.
- Utilise le Placard si cohérent.
`;

  const user = `
PLANNING (TSV):
${inputTSV}

PORTIONS (STRICT):
${portionsLines}

CIBLES (g cru):
${targetsLines}

Matériel autorisé: ${allowedTxt || '(libre)'}
Interdits (STRICT): ${bannedTxt}
Cuisines (soft): ${cuisinesTxt}
Éviter (STRICT): ${avoidTxt}
Allergies (STRICT): ${allergensTxt}${likesTxt}${placardTxt}

🧮 kcal PAR PERSONNE:
- Ajoute "kcal_per_person" par profil (indicatif).
FORMAT:
{"recipes":[{ "title":"...", "cuisine_family":"...", "duration_min":30,
"portions":{"Thomas":1,"Anaïs":1,...},
"macros_targets":{"glucides_g_cru":..., "viandes_poissons_g_cru":..., "legumes_g_cru":...},
"kcal_per_person":{"Thomas":650,"Anaïs":520,...},
"equipment":["poêle","casserole"],
"ingredients":[{"name":"Riz basmati","qty":400,"unit":"g"}],
"steps":["..."], "sauce_steps":["..."], "benefits_sport":"..."}]}
`;

  return {system,user};
}

/* =============== OPENAI CALL =============== */
async function callOpenAI({system,user}){
  const key = (state.apiKey||'').trim();
  if(!key){ throw new Error('Clé OpenAI manquante.'); }

  const body = {
    model: state.model || 'gpt-4.1-mini',
    input: [
      {role:"system", content: system},
      {role:"user", content: user}
    ],
    temperature: 0.35,
    max_output_tokens: state.maxTokens || 12000,
    text: { format: { type: "json_object" } }
  };

  const res = await fetch('https://api.openai.com/v1/responses', {
    method:'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${key}` },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const t = await res.text();
    throw new Error(`Erreur API ${res.status}: ${t.slice(0,400)}`);
  }
  return await res.json();
}

/* =============== RENDER RESULTS =============== */
function renderPlan(plan){
  resultsEl.innerHTML='';
  const tpl = document.getElementById('recipeTpl');
  (plan.recipes||[]).forEach((r,i)=>{
    const node = tpl.content.cloneNode(true);
    node.querySelector('.recipe-title').textContent = `Recette ${i+1} — ${r.title||''}`;
    node.querySelector('.pill').textContent = (r.duration_min?`${r.duration_min} min`:'');
    node.querySelector('.r-cuisine').textContent = r.cuisine_family||'';
    node.querySelector('.r-duree').textContent = r.duration_min||'';
    node.querySelector('.r-matos').textContent = (r.equipment||[]).join(', ');
    node.querySelector('.r-portions').textContent = Object.entries(r.portions||{}).map(([n,v])=>`${n}:${v}`).join(' · ');
    node.querySelector('.r-cibles').textContent = `G:${r?.macros_targets?.glucides_g_cru??0} · V:${r?.macros_targets?.viandes_poissons_g_cru??0} · L:${r?.macros_targets?.legumes_g_cru??0}`;
    node.querySelector('.r-kcal').textContent = r.kcal_per_person ? Object.entries(r.kcal_per_person).map(([n,v])=>`${n}:${v} kcal`).join(' · ') : '';

    const ingTbody = node.querySelector('.r-ing');
    (r.ingredients||[]).forEach(i=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i.name||''}</td><td>${i.qty||0}</td><td>${i.unit||''}</td>`;
      ingTbody.appendChild(tr);
    });

    const steps = node.querySelector('.r-steps');
    (r.steps||[]).forEach(s=>{ const li=document.createElement('li'); li.textContent=s; steps.appendChild(li); });
    const sauce = node.querySelector('.r-sauce');
    (r.sauce_steps||[]).forEach(s=>{ const li=document.createElement('li'); li.textContent=s; sauce.appendChild(li); });

    node.querySelector('.r-benef').textContent = r.benefits_sport||'';
    resultsEl.appendChild(node);
  });
}

/* =============== MAIN ACTION =============== */
generateBtn.addEventListener('click', async ()=>{
  try{
    statusEl.textContent = '⚙️ Génération en cours...';
    const payload = buildPromptPayload();
    const raw = await callOpenAI(payload);

    // Extract text
    let txt = '';
    if (typeof raw.output_text === 'string') {
      txt = raw.output_text;
    } else if (Array.isArray(raw.output)) {
      txt = raw.output.flatMap(o=>o.content||[]).map(p=>p.text||'').filter(Boolean).join('\n');
    } else {
      throw new Error('Réponse inattendue.');
    }

    // Strict parse
    txt = (txt||'').trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
    txt = txt.replace(/,\s*([}\]])/g,'$1');
    const first = txt.indexOf('{'), last = txt.lastIndexOf('}');
    const core = (first>-1 && last>first) ? txt.slice(first,last+1) : txt;
    const plan = JSON.parse(core);

    renderPlan(plan);
    statusEl.textContent = '✅ Terminé';
    // switch to Planning tab if not visible
    document.querySelector('.tab[data-tab="planning"]').click();
  }catch(e){
    console.error(e);
    statusEl.textContent = '❌ ' + e.message;
  }
});