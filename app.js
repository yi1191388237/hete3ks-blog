(() => {
  const cfg = window.BLOG_CONFIG || {};
  const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const db = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  let posts = [...(window.DEMO_POSTS || [])];
  let activeCategory = "全部";
  let activePost = null;
  const $ = id => document.getElementById(id);
  const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateFmt = d => { if(!d) return ""; const date=new Date(d); return Number.isNaN(date.getTime())?"":date.toLocaleDateString("zh-CN",{year:"numeric",month:"short",day:"numeric"}); };
  const norm = p => ({...p, category:p.category||"未分类", excerpt:p.excerpt||"", cover_symbol:p.cover_symbol||"H", cover_color:p.cover_color||"#dce2d4", published_at:p.published_at||p.created_at||"", content:p.content||""});
  async function loadPosts(){
    if(db){
      const {data,error}=await db.from("posts").select("id,title,slug,category,excerpt,content,cover_symbol,cover_color,published_at,created_at").eq("status","published").lte("published_at",new Date().toISOString()).order("published_at",{ascending:false});
      if(error){console.error(error); showToast("在线文章加载失败，当前显示演示文章。");}
      else posts=(data||[]).map(norm);
    }
    renderIndex();
  }
  function card(p){return `<article class="post-card"><a href="#post/${encodeURIComponent(p.slug||p.id)}" data-post="${safe(p.slug||p.id)}"><div class="post-card-cover" style="--cover:${safe(p.cover_color)}"><span class="cover-symbol">${safe(p.cover_symbol)}</span></div><div class="post-card-body"><div class="post-meta"><span class="post-category">${safe(p.category)}</span><span>${Math.max(1,Math.ceil((String(p.content).replace(/<[^>]*>/g,"").length||300)/450))} 分钟</span></div><h3>${safe(p.title)}</h3><p>${safe(p.excerpt)}</p><div class="post-meta post-bottom"><span>${dateFmt(p.published_at)}</span><span class="read-more">阅读全文 <span>↗</span></span></div></div></a></article>`}
  function renderIndex(){
    const categories=["全部",...new Set(posts.map(p=>p.category))];
    $("categoryFilters").innerHTML=categories.map(c=>`<button class="filter-btn ${c===activeCategory?"active":""}" data-cat="${safe(c)}">${safe(c)}</button>`).join("");
    const q=$("searchInput").value.trim().toLowerCase();
    const visible=posts.filter(p=>(activeCategory==="全部"||p.category===activeCategory)&&[p.title,p.excerpt,p.category,p.content].join(" ").toLowerCase().includes(q));
    $("postGrid").innerHTML=visible.map(card).join("")||"";
    $("emptyState").hidden=visible.length>0;
    $("postCount").textContent=`${visible.length} 篇文章`;
    $("year").textContent=new Date().getFullYear();
  }
  function openPost(key){
    const p=posts.find(x=>String(x.slug||x.id)===decodeURIComponent(key));
    if(!p){showToast("没有找到这篇文章。");location.hash="articles";return;}
    activePost=p;
    $("articleContent").innerHTML=`<div class="article-head"><a class="under-link" href="#articles">← 返回文章列表</a><p class="eyebrow">${safe(p.category)}　/　${dateFmt(p.published_at)}</p><h1>${safe(p.title)}</h1><p class="article-lead">${safe(p.excerpt)}</p></div><div class="article-cover" style="--cover:${safe(p.cover_color)};background:var(--cover)">${safe(p.cover_symbol)}</div><div class="article-body">${p.content}</div><div class="article-tail">感谢阅读 · Hete3ks</div>`;
    $("articleModal").hidden=false;document.body.style.overflow="hidden";document.title=`${p.title} — Hete3ks`;
  }
  function closePost(){ $("articleModal").hidden=true;document.body.style.overflow="";document.title="Hete3ks — Notes & Discoveries"; }
  function showToast(msg){let el=$("toast");if(!el){el=document.createElement("div");el.id="toast";el.className="toast";document.body.appendChild(el)}el.textContent=msg;el.classList.add("show");clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove("show"),3200);}
  document.addEventListener("click",e=>{
    const cat=e.target.closest("[data-cat]");if(cat){activeCategory=cat.dataset.cat;renderIndex();return;}
    const post=e.target.closest("[data-post]");if(post){e.preventDefault();location.hash="post/"+encodeURIComponent(post.dataset.post);return;}
  });
  $("searchInput").addEventListener("input",renderIndex);
  $("closeArticle").addEventListener("click",()=>{closePost();location.hash="articles";});
  $("articleModal").addEventListener("click",e=>{if(e.target.dataset.close){closePost();location.hash="articles";}});
  window.addEventListener("hashchange",()=>{const match=location.hash.match(/^#post\/(.+)$/);if(match)openPost(match[1]);else closePost();});
  $("backTop").addEventListener("click",e=>{e.preventDefault();window.scrollTo({top:0,behavior:"smooth"});});
  function setTheme(dark){document.body.classList.toggle("dark",dark);$("themeToggle").textContent=dark?"☼":"◐";try{localStorage.setItem("hete3ks-theme",dark?"dark":"light")}catch(_){}}
  let dark=false;try{dark=localStorage.getItem("hete3ks-theme")==="dark"}catch(_){}setTheme(dark);$("themeToggle").addEventListener("click",()=>setTheme(!document.body.classList.contains("dark")));
  if(!hasSupabase){const note=document.createElement("div");note.className="setup-note";note.innerHTML='<span>演示模式</span>：当前显示示例文章。配置 Supabase 后即可启用在线文章与管理后台。';document.querySelector("main").prepend(note);}
  const match=location.hash.match(/^#post\/(.+)$/);
  loadPosts().then(()=>{if(match)openPost(match[1]);});
})();