const CONFIG = window.TATTOO_SOCIAL_CONFIG || {};
const LIVE = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase?.createClient);
const sb = LIVE ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey) : null;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const screen = $('#screen');
const toast = $('#toast');
const postDialog = $('#postDialog');
const authDialog = $('#authDialog');

const STYLES = ['fine line', 'blackwork', 'floral', 'ornamental', 'japanese', 'lettering', 'micro', 'abstract'];

const state = {
  route: 'feed',
  routeParam: null,
  feedMode: 'following',
  search: '',
  session: null,
  me: null,
  posts: [],
  profiles: [],
  notifications: [],
  likes: new Set(),
  saves: new Set(),
  following: new Set(),
  busy: false,
  authMode: 'signin'
};

function artSvg(seed, title) {
  const palettes = [
    ['#f3efe8','#171719','#b9b3aa'],
    ['#ece9e4','#1b1b1e','#9d9992'],
    ['#f0eee9','#202124','#c6c0b7'],
    ['#e8e7e2','#131416','#aaa59e']
  ];
  const [bg, ink, soft] = palettes[seed % palettes.length];
  const kind = seed % 4;
  const center = kind === 0
    ? `<path d="M450 170c-110 45-175 156-140 268 34 108 141 165 248 131-95-8-166-87-166-183 0-89 61-164 145-180-28-35-57-47-87-36Z" fill="none" stroke="${ink}" stroke-width="18"/><circle cx="580" cy="285" r="24" fill="${ink}"/><path d="M580 210v150M505 285h150" stroke="${soft}" stroke-width="6"/>`
    : kind === 1
      ? `<path d="M450 150c-88 82-128 165-119 248 10 88 76 152 119 203 43-51 109-115 119-203 9-83-31-166-119-248Z" fill="none" stroke="${ink}" stroke-width="14"/><path d="M450 190v365M365 310c62 18 108 70 85 132M535 310c-62 18-108 70-85 132" fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round"/>`
      : kind === 2
        ? `<g fill="none" stroke="${ink}" stroke-width="12"><circle cx="450" cy="350" r="70"/><ellipse cx="450" cy="250" rx="55" ry="110"/><ellipse cx="450" cy="450" rx="55" ry="110"/><ellipse cx="350" cy="350" rx="110" ry="55"/><ellipse cx="550" cy="350" rx="110" ry="55"/><path d="M450 520c-8 55-2 100 21 140M448 570c-58 8-92 35-120 78"/></g>`
        : `<g fill="none" stroke="${ink}" stroke-width="11" stroke-linecap="round"><path d="M260 520c88-210 154-315 198-315 49 0 110 105 182 315"/><path d="M320 455c84-84 171-84 260 0"/><circle cx="450" cy="355" r="52"/><path d="M450 240v230M335 355h230" opacity=".45"/></g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100"><rect width="900" height="1100" fill="${bg}"/><rect x="85" y="80" width="730" height="850" rx="28" fill="none" stroke="${soft}" stroke-width="2"/>${center}<text x="90" y="1015" font-family="Arial,sans-serif" font-size="26" fill="${ink}" opacity=".7">${escapeXml(title)}</text><text x="90" y="1055" font-family="Arial,sans-serif" font-size="14" fill="${ink}" opacity=".42">TATTOO SOCIAL — DEMO ART</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s='') { return String(s).replace(/[<>&'\"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','\"':'&quot;'}[c])); }
function escapeHtml(s='') { return String(s).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c])); }
function fmtTime(ts) {
  const d = new Date(ts); const sec = Math.max(1,(Date.now()-d.getTime())/1000);
  if (sec < 60) return 'now'; if (sec < 3600) return `${Math.floor(sec/60)}m`; if (sec < 86400) return `${Math.floor(sec/3600)}h`;
  return `${Math.floor(sec/86400)}d`;
}
function initial(name='?') { return name.trim().slice(0,1).toUpperCase() || '?'; }
function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>toast.classList.remove('show'),2200); }
function avatarHtml(p, cls='avatar') { return p?.avatar_url ? `<img class="${cls}" src="${escapeHtml(p.avatar_url)}" alt="">` : `<div class="${cls} fallback">${escapeHtml(initial(p?.display_name || p?.username))}</div>`; }

const DEMO_KEY = 'tattoo-social-demo-v2';
const DEMO_ME = { id:'demo-me', username:'you', display_name:'Your Studio', bio:'Tattoo artist · Kyoto', avatar_url:'' };
const DEMO_PROFILES = [
  DEMO_ME,
  {id:'u1',username:'mio.ink',display_name:'Mio',bio:'Fine line · botanical · Tokyo',avatar_url:''},
  {id:'u2',username:'noirneedle',display_name:'Noir Needle',bio:'Blackwork & ornamental · Osaka',avatar_url:''},
  {id:'u3',username:'haru.lines',display_name:'Haru',bio:'Micro tattoo · Kyoto',avatar_url:''},
  {id:'u4',username:'sumi.room',display_name:'Sumi Room',bio:'Japanese inspired · Kobe',avatar_url:''}
];
const DEMO_POSTS = [
  ['p1','u1','Moon phase botanical','fine line','A quiet moon study with small botanical details.'],
  ['p2','u2','Ornamental spine piece','ornamental','Custom ornamental flow designed for the back.'],
  ['p3','u3','Tiny swallow','micro','Small movement study, healed result.'],
  ['p4','u4','Peony and wind','japanese','Peony composition inspired by traditional movement.'],
  ['p5','u1','Wildflower linework','floral','Freehand wildflower placement for the inner arm.'],
  ['p6','u2','Black geometry','blackwork','Negative space and geometric rhythm.']
].map((x,i)=>({ id:x[0], user_id:x[1], image_url:artSvg(i+1,x[2]), caption:x[4], tags:[x[3], i%2?'custom':'minimal'], style:x[3], created_at:new Date(Date.now()-(i+1)*52*60*1000).toISOString(), like_count:[32,18,51,27,42,16][i], save_count:[8,11,13,5,17,7][i] }));

function demoLoad() {
  let data; try { data = JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); } catch { data = {}; }
  return {
    posts: Array.isArray(data.posts) ? data.posts : DEMO_POSTS,
    likes: new Set(data.likes || ['p1']),
    saves: new Set(data.saves || ['p2']),
    following: new Set(data.following || ['u1','u3']),
    notifications: Array.isArray(data.notifications) ? data.notifications : [
      {id:'n1',type:'follow',actor_id:'u1',created_at:new Date(Date.now()-38*60*1000).toISOString(),read_at:null},
      {id:'n2',type:'like',actor_id:'u3',post_id:'p-demo',created_at:new Date(Date.now()-5*3600*1000).toISOString(),read_at:null}
    ]
  };
}
function demoSave() {
  localStorage.setItem(DEMO_KEY, JSON.stringify({posts:state.posts,likes:[...state.likes],saves:[...state.saves],following:[...state.following],notifications:state.notifications}));
}

async function boot() {
  $('#connectionBadge').textContent = LIVE ? 'Supabase connected' : 'Demo mode';
  $('#connectionBadge').classList.toggle('live', LIVE);
  renderStyleChips();
  wireGlobalEvents();
  if (LIVE) {
    const { data:{ session } } = await sb.auth.getSession();
    state.session = session;
    await refreshLiveIdentity();
    sb.auth.onAuthStateChange(async (_event, sessionNow) => {
      state.session = sessionNow; await refreshLiveIdentity(); await refreshAll(); render();
    });
  } else {
    const d = demoLoad(); state.me = DEMO_ME; state.profiles = DEMO_PROFILES; Object.assign(state,d);
  }
  readRoute();
  await refreshAll();
  render();
}

async function refreshLiveIdentity() {
  const user = state.session?.user;
  state.me = null;
  if (user) {
    const { data } = await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
    state.me = data || {id:user.id, username:user.email?.split('@')[0] || 'user', display_name:'New artist', bio:'', avatar_url:''};
  }
  $('#authBtn').textContent = user ? 'Sign out' : 'Sign in';
}

async function refreshAll() {
  if (!LIVE) { renderRightRail(); updateBadge(); return; }
  try {
    const [profilesRes, notificationsRes] = await Promise.all([
      sb.from('profiles').select('*').order('created_at',{ascending:false}).limit(30),
      state.me ? sb.from('notifications').select('*').eq('user_id',state.me.id).order('created_at',{ascending:false}).limit(50) : Promise.resolve({data:[]})
    ]);
    state.profiles = profilesRes.data || [];
    state.notifications = notificationsRes.data || [];
    if (state.me) {
      const [likesRes,savesRes,followRes] = await Promise.all([
        sb.from('likes').select('post_id').eq('user_id',state.me.id),
        sb.from('saves').select('post_id').eq('user_id',state.me.id),
        sb.from('follows').select('following_id').eq('follower_id',state.me.id)
      ]);
      state.likes = new Set((likesRes.data||[]).map(x=>x.post_id));
      state.saves = new Set((savesRes.data||[]).map(x=>x.post_id));
      state.following = new Set((followRes.data||[]).map(x=>x.following_id));
    } else { state.likes.clear(); state.saves.clear(); state.following.clear(); }
    await loadLivePosts();
  } catch (e) { console.error(e); showToast('Could not load live data'); }
  renderRightRail(); updateBadge();
}

async function loadLivePosts() {
  let allowedIds = null;
  if (state.feedMode === 'following' && state.me) allowedIds = [state.me.id, ...state.following];
  let q = sb.from('posts').select('*').order('created_at',{ascending:false}).limit(60);
  if (allowedIds?.length) q = q.in('user_id',allowedIds);
  const { data: posts, error } = await q; if (error) throw error;
  const ids = (posts||[]).map(p=>p.id), userIds=[...new Set((posts||[]).map(p=>p.user_id))];
  const [profRes,likesRes,savesRes] = await Promise.all([
    userIds.length ? sb.from('profiles').select('*').in('id',userIds) : Promise.resolve({data:[]}),
    ids.length ? sb.from('likes').select('post_id').in('post_id',ids) : Promise.resolve({data:[]}),
    ids.length ? sb.from('saves').select('post_id').in('post_id',ids) : Promise.resolve({data:[]})
  ]);
  const profMap=new Map((profRes.data||[]).map(p=>[p.id,p]));
  const lc={}, sc={}; (likesRes.data||[]).forEach(x=>lc[x.post_id]=(lc[x.post_id]||0)+1); (savesRes.data||[]).forEach(x=>sc[x.post_id]=(sc[x.post_id]||0)+1);
  state.posts=(posts||[]).map(p=>({...p,profile:profMap.get(p.user_id),like_count:lc[p.id]||0,save_count:sc[p.id]||0,style:p.style || p.tags?.[0] || 'tattoo'}));
}

function profileFor(id) { return state.profiles.find(p=>p.id===id) || (state.me?.id===id?state.me:null) || {id,username:'artist',display_name:'Artist',bio:'',avatar_url:''}; }

function readRoute() {
  const raw=(location.hash||'#feed').slice(1); const [route,param]=raw.split(':');
  state.route=['feed','discover','saved','notifications','profile'].includes(route)?route:'feed';
  state.routeParam=param||null; syncNav();
}
function go(route,param=null){ location.hash=`#${route}${param?`:${param}`:''}`; }
function syncNav(){
  $$('[data-route]').forEach(b=>b.classList.toggle('active', b.dataset.route===state.route));
  $$('.bottom-nav button[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===state.route));
}

function pageHead(kicker,title,desc=''){ return `<header class="page-head"><p class="eyebrow">${escapeHtml(kicker)}</p><h1>${escapeHtml(title)}</h1>${desc?`<p>${escapeHtml(desc)}</p>`:''}</header>`; }
function empty(title,body){ return `<div class="empty"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div>`; }

function postCard(p) {
  const prof=p.profile || profileFor(p.user_id); const liked=state.likes.has(p.id), saved=state.saves.has(p.id), following=state.following.has(p.user_id), own=state.me?.id===p.user_id;
  return `<article class="post-card" data-post="${p.id}">
    <div class="post-image-wrap"><img class="post-image" src="${escapeHtml(p.image_url)}" alt="Tattoo artwork" loading="lazy"><span class="post-style">${escapeHtml(p.style||p.tags?.[0]||'tattoo')}</span></div>
    <div class="post-body">
      <div class="post-author-row">${avatarHtml(prof)}<button class="author-copy" data-profile="${prof.id}" style="border:0;background:transparent;text-align:left;padding:0;cursor:pointer"><strong>${escapeHtml(prof.display_name||prof.username)}</strong><small>@${escapeHtml(prof.username||'artist')} · ${fmtTime(p.created_at)}</small></button>${own?'':`<button class="follow-mini ${following?'following':''}" data-follow="${prof.id}">${following?'Following':'Follow'}</button>`}</div>
      ${p.caption?`<p class="caption">${escapeHtml(p.caption)}</p>`:''}
      <div class="tags">${(p.tags||[]).map(t=>`<button class="tag" data-search="${escapeHtml(t)}" style="border:0;background:transparent;padding:0;cursor:pointer">#${escapeHtml(t)}</button>`).join('')}</div>
      <div class="post-actions"><button class="icon-action like ${liked?'active':''}" data-like="${p.id}">♥ <span>${p.like_count||0}</span></button><button class="icon-action ${saved?'active':''}" data-save="${p.id}">◇ <span>${saved?'Saved':'Save'}</span></button></div>
    </div>
  </article>`;
}

function renderFeed(){
  const list = LIVE ? state.posts : state.posts.filter(p=>state.feedMode==='latest' || p.user_id===state.me?.id || state.following.has(p.user_id));
  screen.innerHTML = `${pageHead('TATTOO NETWORK','Your feed','Artwork from artists you follow, plus your own posts.')}
    <div class="feed-tabs"><button class="pill ${state.feedMode==='following'?'active':''}" data-feed-mode="following">Following</button><button class="pill ${state.feedMode==='latest'?'active':''}" data-feed-mode="latest">Latest</button></div>
    ${list.length?`<div class="post-grid">${list.map(postCard).join('')}</div>`:empty('No posts yet','Follow artists or publish the first work in your feed.')}`;
}

function renderDiscover(){
  const q=state.search.trim().toLowerCase();
  const profiles=state.profiles.filter(p=>!q || [p.username,p.display_name,p.bio].join(' ').toLowerCase().includes(q));
  const posts=state.posts.filter(p=>!q || [p.caption,p.style,...(p.tags||[])].join(' ').toLowerCase().includes(q));
  screen.innerHTML=`${pageHead('DISCOVER','Find your next reference','Search artists, styles and tattoo work.')}
    <div class="discover-search"><input id="discoverSearch" class="search-input" type="search" value="${escapeHtml(state.search)}" placeholder="fine line, dragon, artist…"></div>
    <div class="style-chips">${STYLES.map(s=>`<button data-search="${s}">${s}</button>`).join('')}</div>
    <section class="result-section"><h2>Artists</h2>${profiles.length?profiles.slice(0,8).map(profileResult).join(''):empty('No artists','Try another keyword.')}</section>
    <section class="result-section"><h2>Work</h2>${posts.length?`<div class="post-grid">${posts.map(postCard).join('')}</div>`:empty('No work found','Try another style or keyword.')}</section>`;
  const input=$('#discoverSearch'); input?.addEventListener('input',()=>{state.search=input.value; clearTimeout(input._t); input._t=setTimeout(renderDiscover,120);});
}
function profileResult(p){ const f=state.following.has(p.id), own=state.me?.id===p.id; return `<div class="profile-card">${avatarHtml(p)}<button class="profile-card-copy" data-profile="${p.id}" style="border:0;background:transparent;text-align:left;padding:0;cursor:pointer"><strong>${escapeHtml(p.display_name||p.username)}</strong><span>@${escapeHtml(p.username)} · ${escapeHtml(p.bio||'Tattoo artist')}</span></button>${own?'':`<button class="follow-mini ${f?'following':''}" data-follow="${p.id}">${f?'Following':'Follow'}</button>`}</div>`; }

function renderSaved(){ const list=state.posts.filter(p=>state.saves.has(p.id)); screen.innerHTML=`${pageHead('COLLECTION','Saved work','References and artwork you want to return to.')}${list.length?`<div class="post-grid">${list.map(postCard).join('')}</div>`:empty('Nothing saved yet','Tap Save on artwork to build your collection.')}`; }

function renderNotifications(){
  const list=state.notifications; screen.innerHTML=`${pageHead('ACTIVITY','Notifications','Likes and new followers appear here.')}${list.length?`<div class="notification-list">${list.map(notificationHtml).join('')}</div>`:empty('No notifications','When people interact with your work, you will see it here.')}`;
  if (LIVE && state.me) sb.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',state.me.id).is('read_at',null).then(()=>{state.notifications.forEach(n=>n.read_at=n.read_at||new Date().toISOString());updateBadge();});
  else { state.notifications.forEach(n=>n.read_at=n.read_at||new Date().toISOString()); demoSave(); updateBadge(); }
}
function notificationHtml(n){ const p=profileFor(n.actor_id); const text=n.type==='follow'?'started following you':n.type==='save'?'saved your work':'liked your work'; return `<div class="notification ${n.read_at?'':'unread'}">${avatarHtml(p)}<div class="notification-copy"><p><strong>${escapeHtml(p.display_name||p.username)}</strong> ${text}</p><small>${fmtTime(n.created_at)}</small></div></div>`; }

function renderProfile(){
  const id=state.routeParam || state.me?.id || state.profiles[0]?.id; const p=profileFor(id); const list=state.posts.filter(x=>x.user_id===id); const followers = LIVE ? '—' : [...state.following].includes(id)?'1':'0'; const following = id===state.me?.id ? state.following.size : '—';
  screen.innerHTML=`${pageHead('PROFILE','Artist profile')}
    <section class="profile-hero"><div class="profile-top">${avatarHtml(p)}<div class="profile-top-copy"><h1>${escapeHtml(p.display_name||p.username)}</h1><p>@${escapeHtml(p.username)}<br>${escapeHtml(p.bio||'Tattoo artist')}</p></div>${state.me?.id!==id?`<button class="primary-action" data-follow="${id}">${state.following.has(id)?'Following':'Follow'}</button>`:''}</div><div class="profile-stats"><div class="stat"><b>${list.length}</b><span>Posts</span></div><div class="stat"><b>${followers}</b><span>Followers</span></div><div class="stat"><b>${following}</b><span>Following</span></div></div></section>
    ${list.length?`<div class="post-grid">${list.map(postCard).join('')}</div>`:empty('No work yet','Published tattoo work will appear here.')}`;
}

function render(){ syncNav(); if(state.route==='feed')renderFeed(); else if(state.route==='discover')renderDiscover(); else if(state.route==='saved')renderSaved(); else if(state.route==='notifications')renderNotifications(); else renderProfile(); renderRightRail(); updateBadge(); }

function renderStyleChips(){ $('#styleChips').innerHTML=STYLES.slice(0,6).map(s=>`<button data-search="${s}">${s}</button>`).join(''); }
function renderRightRail(){
  const target=$('#suggestedArtists'); if(!target)return; const list=state.profiles.filter(p=>p.id!==state.me?.id).slice(0,5);
  target.innerHTML=list.map(p=>`<div class="artist-row">${avatarHtml(p)}<button class="artist-row-copy" data-profile="${p.id}" style="border:0;background:transparent;text-align:left;padding:0"><strong>${escapeHtml(p.display_name||p.username)}</strong><small>@${escapeHtml(p.username)}</small></button><button data-follow="${p.id}">${state.following.has(p.id)?'Following':'Follow'}</button></div>`).join('');
}
function updateBadge(){ const unread=state.notifications.filter(n=>!n.read_at).length; const b=$('#notificationBadge'); if(b)b.hidden=!unread; }

function requireAuth(){ if(!LIVE)return true; if(state.me)return true; showToast('Sign in to use this feature'); openAuth(); return false; }

async function toggleLike(postId){
  if(!requireAuth())return; const active=state.likes.has(postId); const post=state.posts.find(p=>p.id===postId);
  if(LIVE){ const q=sb.from('likes'); const {error}=active?await q.delete().eq('user_id',state.me.id).eq('post_id',postId):await q.insert({user_id:state.me.id,post_id:postId}); if(error){showToast(error.message);return;} }
  if(active){state.likes.delete(postId);if(post)post.like_count=Math.max(0,(post.like_count||0)-1);} else {state.likes.add(postId);if(post)post.like_count=(post.like_count||0)+1;if(!LIVE&&post?.user_id!==state.me.id)state.notifications.unshift({id:crypto.randomUUID(),type:'like',actor_id:state.me.id,post_id:postId,created_at:new Date().toISOString(),read_at:null});}
  if(!LIVE)demoSave(); render();
}
async function toggleSave(postId){
  if(!requireAuth())return; const active=state.saves.has(postId); const post=state.posts.find(p=>p.id===postId);
  if(LIVE){ const q=sb.from('saves'); const {error}=active?await q.delete().eq('user_id',state.me.id).eq('post_id',postId):await q.insert({user_id:state.me.id,post_id:postId}); if(error){showToast(error.message);return;} }
  if(active){state.saves.delete(postId);if(post)post.save_count=Math.max(0,(post.save_count||0)-1);} else {state.saves.add(postId);if(post)post.save_count=(post.save_count||0)+1;}
  if(!LIVE)demoSave(); render();
}
async function toggleFollow(userId){
  if(!requireAuth())return; if(userId===state.me?.id)return; const active=state.following.has(userId);
  if(LIVE){ const q=sb.from('follows'); const {error}=active?await q.delete().eq('follower_id',state.me.id).eq('following_id',userId):await q.insert({follower_id:state.me.id,following_id:userId}); if(error){showToast(error.message);return;} }
  active?state.following.delete(userId):state.following.add(userId); if(!LIVE)demoSave(); if(LIVE&&state.feedMode==='following')await loadLivePosts(); render();
}

function openPost(){ if(!requireAuth())return; postDialog.showModal(); }
function openAuth(){ if(!LIVE){showToast('Supabase is not connected yet');return;} authDialog.showModal(); }

async function publishPost(e){
  e.preventDefault(); if(state.busy)return; const file=$('#postImage').files[0]; if(!file){showToast('Choose an image');return;} state.busy=true; $('#publishBtn').textContent='Publishing…';
  const caption=$('#postCaption').value.trim(); const tags=$('#postTags').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,8); const style=tags[0]||'tattoo';
  try {
    let imageUrl;
    if(LIVE){
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase(); const path=`${state.me.id}/${crypto.randomUUID()}.${ext}`;
      const up=await sb.storage.from('tattoo-images').upload(path,file,{cacheControl:'3600',upsert:false}); if(up.error)throw up.error;
      imageUrl=sb.storage.from('tattoo-images').getPublicUrl(path).data.publicUrl;
      const ins=await sb.from('posts').insert({user_id:state.me.id,image_url:imageUrl,caption,tags,style}).select().single(); if(ins.error)throw ins.error;
      await refreshAll();
    } else {
      imageUrl=await fileToDataUrl(file); const p={id:crypto.randomUUID(),user_id:state.me.id,image_url:imageUrl,caption,tags,style,created_at:new Date().toISOString(),like_count:0,save_count:0}; state.posts.unshift(p); demoSave();
    }
    postDialog.close(); e.target.reset(); resetPreview(); go('feed'); showToast('Published'); render();
  } catch(err){console.error(err);showToast(err.message||'Could not publish');}
  finally {state.busy=false;$('#publishBtn').textContent='Publish';}
}
function fileToDataUrl(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}
function resetPreview(){ $('#uploadPreview').innerHTML='<span>＋</span><strong>Add tattoo image</strong><small>JPG, PNG, WEBP</small>'; }

async function submitAuth(e){
  e.preventDefault(); if(!LIVE)return; const email=$('#authEmail').value.trim(), password=$('#authPassword').value;
  $('#authSubmit').textContent='Please wait…';
  try {
    const result=state.authMode==='signup'?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});
    if(result.error)throw result.error; authDialog.close(); showToast(state.authMode==='signup'?'Account created':'Signed in');
  } catch(err){showToast(err.message||'Authentication failed');}
  finally {$('#authSubmit').textContent=state.authMode==='signup'?'Create account':'Sign in';}
}
function toggleAuthMode(){ state.authMode=state.authMode==='signin'?'signup':'signin'; $('#authTitle').textContent=state.authMode==='signup'?'Create account':'Sign in'; $('#authSubmit').textContent=state.authMode==='signup'?'Create account':'Sign in'; $('#authSwitch').textContent=state.authMode==='signup'?'I already have an account':'Create a new account'; }

function wireGlobalEvents(){
  window.addEventListener('hashchange',()=>{readRoute();render();});
  document.addEventListener('click',async e=>{
    const route=e.target.closest('[data-route]')?.dataset.route; if(route){go(route);return;}
    const prof=e.target.closest('[data-profile]')?.dataset.profile; if(prof){go('profile',prof);return;}
    const search=e.target.closest('[data-search]')?.dataset.search; if(search){state.search=search;go('discover');render();return;}
    const like=e.target.closest('[data-like]')?.dataset.like; if(like){await toggleLike(like);return;}
    const save=e.target.closest('[data-save]')?.dataset.save; if(save){await toggleSave(save);return;}
    const follow=e.target.closest('[data-follow]')?.dataset.follow; if(follow){await toggleFollow(follow);return;}
    const mode=e.target.closest('[data-feed-mode]')?.dataset.feedMode; if(mode){state.feedMode=mode;if(LIVE)await loadLivePosts();render();return;}
  });
  $('#newPostBtn').addEventListener('click',openPost); $('#mobileNewPost').addEventListener('click',openPost); $('#bottomNewPost').addEventListener('click',openPost);
  $$('.modal-close').forEach(b=>b.addEventListener('click',()=>postDialog.close())); $$('.auth-close').forEach(b=>b.addEventListener('click',()=>authDialog.close()));
  $('#postForm').addEventListener('submit',publishPost); $('#authForm').addEventListener('submit',submitAuth); $('#authSwitch').addEventListener('click',toggleAuthMode);
  $('#postImage').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('#uploadPreview').innerHTML=`<img src="${r.result}" alt="Preview">`;};r.readAsDataURL(f);});
  $('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){state.search=e.target.value;go('discover');render();}});
  $('#authBtn').addEventListener('click',async()=>{if(LIVE&&state.me){await sb.auth.signOut();showToast('Signed out');}else openAuth();});
}

boot();
