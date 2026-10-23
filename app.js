(() => {
  const cfg = window.BLOG_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !String(cfg.SUPABASE_ANON_KEY).includes("在这里填入");
  const client = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const $ = id => document.getElementById(id);
  let allPosts = [], filtered = [], activeCategory = "全部", page = 1, currentPostId = null;
  const pageSize = 9;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeMarkdown = s => {
    const html = window.marked ? marked.parse(String(s || ""), {gfm:true, breaks:false}) : `<p>${esc(s)}</p>`;
    return window.DOMPurify ? DOMPurify.sanitize(html, {USE_PROFILES:{html:true}}) : html;
  };
  const dateText = d => d ? new Date(d).toLocaleDateString("zh-CN",{year:"numeric",month:"short",day:"numeric"}) : "尚未发布";
  function toast(msg){const n=document.createElement("div");n.className="toast";n.textContent=msg;document.body.append(n);setTimeout(()=>n.remove(),2800);}
  function fallbackPosts(){return [
    {id:"sample-1",title:"普通人是上帝制作的半成品",slug:"ordinary-people-are-work-in-progress",category:"思考",excerpt:"人并不是一件等待验收的成品。成长不是为了证明自己值得存在，而是为了获得更多选择生活的能力。",content:"# 普通人是上帝制作的半成品\n\n我们习惯把人生理解成一场不断完善自己的工程。仿佛只要足够努力，最终就能成为一个没有缺点、不会犹豫、永远正确的人。\n\n但人也许从来不是一件等待验收的成品。成长不是为了证明自己值得存在，而是为了获得更多选择生活的能力。\n\n## 不完整不等于失败\n\n有些能力可以通过练习获得，有些遗憾却未必能够彻底修复。承认限制，并不意味着放弃改变；它只是让我们不再把全部精力用来责备自己。\n\n## 为谁完善自己\n\n我们是在成为自己，还是在努力修补别人眼中的自己？这个问题值得反复追问。\n\n> 接受当下的自己，同时不把当下当作最终版本。\n\n## 今天仍然可以开始\n\n人生未必存在一个所有人都认可的完成标准。如果你仍然有机会修改这件作品，那么今天，就不是一个太晚的时间。",cover_symbol:"H",cover_color:"#dce5d5",tags:["人生","哲学"],published_at:"2026-10-22T00:00:00Z",created_at:"2026-10-22T00:00:00Z",status:"published"}
  ];}
  function normalize(p){return {...p,tags:Array.isArray(p.tags)?p.tags:[],published_at:p.published_at||p.created_at};}
  async function loadPosts(){
    if(client){
      const {data,error}=await client.from("posts").select("id,title,slug,category,excerpt,content,cover_symbol,cover_color,status,published_at,created_at,tags").eq("status","published").not("published_at","is",null).lte("published_at",new Date().toISOString()).order("published_at",{ascending:false});
      if(!error){allPosts=(data||[]).map(normalize);render();return;}
      console.error("读取文章失败",error);
    }
    allPosts=fallbackPosts().map(normalize);render();
    if(configured) toast("暂时无法读取在线文章，当前显示演示内容。");
  }
  function render(){
    const categories=["全部",...new Set(allPosts.map(p=>p.category||"随笔"))];
    $("categoryFilters").innerHTML=categories.map(c=>`<button class="filter-btn ${c===activeCategory?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
    $("postCount").textContent=String(allPosts.length).padStart(2,"0");
    $("categoryCount").textContent=String(categories.length-1).padStart(2,"0");
    const q=$("searchInput").value.trim().toLowerCase();
    filtered=allPosts.filter(p=>(activeCategory==="全部"||p.category===activeCategory)&&(!q||[p.title,p.excerpt,p.content,p.category,...p.tags].join(" ").toLowerCase().includes(q)));
    $("resultCount").textContent=`${filtered.length} 篇记录`;
    const shown=filtered.slice(0,page*pageSize);
    $("postGrid").innerHTML=shown.map(p=>`<article class="post-card"><div class="post-cover" style="--cover:${/^#[0-9a-f]{6}$/i.test(p.cover_color||"")?p.cover_color:"#dce5d5"}"><span class="cover-symbol">${esc(p.cover_symbol||"H")}</span></div><div class="post-body"><div class="post-meta"><span class="post-category">${esc(p.category||"随笔")}</span><span>${dateText(p.published_at)}</span></div><h3>${esc(p.title)}</h3><p class="post-excerpt">${esc(p.excerpt||"")}</p><div class="post-tags">${(p.tags||[]).slice(0,3).map(t=>`<span class="tag">#${esc(t)}</span>`).join("")}</div><div class="post-bottom"><span>${Math.max(1,Math.ceil((p.content||"").length/450))} 分钟阅读</span><button data-open="${esc(p.id)}">继续阅读 ↗</button></div></div></article>`).join("");
    $("emptyState").hidden=shown.length>0;
    $("loadMore").hidden=shown.length>=filtered.length;
    $("archiveList").innerHTML=allPosts.slice(0,12).map(p=>`<a class="archive-row" href="#articles" data-open="${esc(p.id)}"><time>${dateText(p.published_at)}</time><strong>${esc(p.title)}</strong><span>${esc(p.category||"随笔")}</span></a>`).join("")||'<span class="muted">还没有公开文章。</span>';
  }
  function tocFor(content){
    const headings=[];const re=/<h([23])[^>]*id="([^"]+)"[^>]*>(.*?)<\/h\1>/g;let m;
    while((m=re.exec(content)))headings.push({level:Number(m[1]),id:m[2],text:m[3].replace(/<[^>]+>/g,"")});
    return headings.length?`<aside class="toc"><strong>本文目录</strong>${headings.map(h=>`<a href="#${h.id}">${h.level===3?"　":""}${esc(h.text)}</a>`).join("")}</aside>`:"<aside class=\"toc\"></aside>";
  }
  async function openArticle(id){
    const p=allPosts.find(x=>String(x.id)===String(id));if(!p)return;
    let body=safeMarkdown(p.content);
    // Add stable heading ids for the table of contents.
    let count=0;body=body.replace(/<h([23])>(.*?)<\/h\1>/g,(_,level,inner)=>{const plain=inner.replace(/<[^>]*>/g,"").trim();const slug="section-"+(++count)+"-"+plain.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-");return `<h${level} id="${slug}">${inner}</h${level}>`;});
    $("articleContent").innerHTML=`<header class="article-head"><p class="eyebrow">${esc(p.category||"随笔")} · ${dateText(p.published_at)}</p><h1>${esc(p.title)}</h1><p class="article-summary">${esc(p.excerpt||"")}</p><div class="post-tags">${(p.tags||[]).map(t=>`<span class="tag">#${esc(t)}</span>`).join("")}</div><div class="reading-progress" id="readingProgress"></div></header><div class="article-layout">${tocFor(body)}<div><div class="markdown-body">${body}</div><section class="comments"><h2>留言与讨论</h2><p class="notice">评论提交后需要经过审核才会公开。请保持友善，避免发布隐私信息。</p><div id="commentsList"><p class="muted">正在加载评论…</p></div><form class="comment-form" id="commentForm"><input name="nickname" maxlength="40" required placeholder="你的昵称（必填）"><input name="email" type="email" maxlength="160" placeholder="邮箱（选填，不会公开）"><textarea name="content" maxlength="2000" required placeholder="写下你的想法（最多 2000 字）"></textarea><button type="submit">提交评论</button><p class="notice" id="commentNotice" aria-live="polite"></p></form></section></div></div>`;
    currentPostId = p.id;
    $("articleModal").hidden=false;document.body.style.overflow="hidden";
    $("closeArticle").focus();
    loadComments(p.id);
    const panel=document.querySelector(".article-panel");panel.onscroll=()=>{const max=panel.scrollHeight-panel.clientHeight;const ratio=max>0?panel.scrollTop/max:0;const bar=document.getElementById("readingProgress");if(bar)bar.style.width=(ratio*100)+"%";};
  }
  async function loadComments(postId){
    const target=$("commentsList");if(!client){target.innerHTML='<p class="notice">评论功能需要完成 Supabase 配置后启用。</p>';return;}
    const {data,error}=await client.from("comments").select("id,nickname,content,created_at").eq("post_id",postId).eq("status","approved").order("created_at",{ascending:true}).limit(100);
    if(error){target.innerHTML='<p class="notice">暂时无法加载评论。</p>';return;}
    target.innerHTML=data.length?data.map(c=>`<article class="comment"><strong>${esc(c.nickname)}</strong><time>${dateText(c.created_at)}</time><p>${esc(c.content)}</p></article>`).join(""):'<p class="muted">还没有评论。欢迎留下第一条经过认真思考的留言。</p>';
  }
  async function submitComment(e,postId){
    e.preventDefault();const form=e.currentTarget;const notice=$("commentNotice");const btn=form.querySelector("button");if(!client){notice.textContent="评论服务尚未配置。";return;}
    const fd=new FormData(form);const payload={post_id:postId,nickname:String(fd.get("nickname")||"").trim(),email:String(fd.get("email")||"").trim()||null,content:String(fd.get("content")||"").trim(),status:"pending"};
    if(!payload.nickname||!payload.content){notice.textContent="请填写昵称和评论内容。";return;}
    btn.disabled=true;notice.textContent="正在提交…";
    const {error}=await client.from("comments").insert(payload);
    btn.disabled=false;
    if(error){notice.textContent="提交失败，请稍后重试。";console.error(error);return;}
    form.reset();notice.textContent="评论已提交，审核通过后会显示。";
  }
  $("articleContent").addEventListener("submit",e=>{if(e.target && e.target.id==="commentForm" && currentPostId!==null)submitComment(e,currentPostId);});
  function closeArticle(){ $("articleModal").hidden=true;document.body.style.overflow="";currentPostId=null; }
  $("themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("hete3ks-theme",document.body.classList.contains("dark")?"dark":"light");});
  if(localStorage.getItem("hete3ks-theme")==="dark")document.body.classList.add("dark");
  $("searchInput").addEventListener("input",()=>{page=1;render();});
  $("categoryFilters").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(b){activeCategory=b.dataset.cat;page=1;render();}});
  $("postGrid").addEventListener("click",e=>{const b=e.target.closest("[data-open]");if(b)openArticle(b.dataset.open);});
  $("archiveList").addEventListener("click",e=>{const b=e.target.closest("[data-open]");if(b){e.preventDefault();openArticle(b.dataset.open);}});
  $("loadMore").addEventListener("click",()=>{page++;render();});
  $("closeArticle").addEventListener("click",closeArticle);
  $("articleModal").addEventListener("click",e=>{if(e.target.dataset.close)closeArticle();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("articleModal").hidden)closeArticle();});
  $("year").textContent=new Date().getFullYear();
  loadPosts();
})();