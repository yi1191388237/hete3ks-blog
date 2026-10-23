(() => {
  const cfg=window.BLOG_CONFIG||{};
  const configured=cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!String(cfg.SUPABASE_ANON_KEY).includes("在这里填入");
  const db=configured&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const md=s=>{const html=window.marked?marked.parse(String(s||""),{gfm:true}):`<p>${esc(s)}</p>`;return window.DOMPurify?DOMPurify.sanitize(html,{USE_PROFILES:{html:true}}):html;};
  let posts=[],comments=[],user=null,preview=false;
  function message(id,msg,isError=false){$(id).textContent=msg;$(id).style.color=isError?"#a13f35":"#53684f";}
  function slugify(s){return String(s||"").trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"").slice(0,100)||"post-"+Date.now();}
  function switchView(logged){$("loginView").hidden=logged;$("dashboardView").hidden=!logged;}
  async function ensureAdmin(){
    if(!db){message("loginMessage","请先在 config.js 填写 Supabase URL 和 anon/publishable 公钥。",true);return;}
    const {data:{session}}=await db.auth.getSession();
    if(!session){switchView(false);return;}
    const {data,error}=await db.rpc("is_blog_admin");
    if(error||data!==true){await db.auth.signOut();switchView(false);message("loginMessage","此账号没有管理员权限。请检查 app_metadata.role=admin 后重新登录。",true);return;}
    user=session.user;$("whoami").textContent=`已登录：${user.email}`;switchView(true);await loadPosts();await loadComments();
  }
  $("loginForm").addEventListener("submit",async e=>{
    e.preventDefault();if(!db){message("loginMessage","请先配置 config.js。",true);return;}
    const fd=new FormData(e.currentTarget);const btn=e.currentTarget.querySelector("button");btn.disabled=true;message("loginMessage","正在登录…");
    const {error}=await db.auth.signInWithPassword({email:String(fd.get("email")).trim(),password:String(fd.get("password"))});
    btn.disabled=false;if(error){message("loginMessage","登录失败："+error.message,true);return;}await ensureAdmin();
  });
  $("forgotPassword").addEventListener("click",async()=>{
    if(!db){message("loginMessage","请先配置 config.js。",true);return;}
    const email=$("loginForm").elements.email.value.trim();if(!email){message("loginMessage","请先输入管理员邮箱。",true);return;}
    const redirectTo=location.origin+location.pathname.replace(/admin\.html$/,"reset-password.html");
    const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo});
    message("loginMessage",error?"发送失败："+error.message:"如果该邮箱已注册，Supabase 将发送密码重置邮件。",!!error);
  });
  $("logoutBtn").addEventListener("click",async()=>{if(db)await db.auth.signOut();switchView(false);});
  async function loadPosts(){
    const {data,error}=await db.from("posts").select("*").order("updated_at",{ascending:false});
    if(error){$("postList").innerHTML=`<p class="message">读取文章失败：${esc(error.message)}</p>`;return;}
    posts=data||[];$("postList").innerHTML=posts.map(p=>`<div class="post-item" data-id="${esc(p.id)}"><strong>${esc(p.title)}</strong><small>${esc(p.category||"随笔")} · ${new Date(p.updated_at||p.created_at).toLocaleDateString("zh-CN")}</small><br><span class="status ${p.status==="published"?"published":""}">${p.status==="published"?"已发布":"草稿"}</span></div>`).join("")||'<p class="empty">还没有文章，点击“新建文章”开始写作。</p>';
  }
  function resetForm(){
    const f=$("postForm");f.reset();f.elements.id.value="";f.elements.category.value="随笔";f.elements.cover_symbol.value="H";f.elements.cover_color.value="#dce5d5";f.elements.status.value="draft";$("editorTitle").textContent="新建文章";$("deletePostBtn").hidden=true;$("markdownInput").hidden=false;$("markdownPreview").hidden=true;preview=false;message("postMessage","");message("saveStatus","未保存");
  }
  function editPost(p){
    const f=$("postForm");f.elements.id.value=p.id;f.elements.title.value=p.title||"";f.elements.category.value=p.category||"随笔";f.elements.tags.value=(p.tags||[]).join(", ");f.elements.slug.value=p.slug||"";f.elements.excerpt.value=p.excerpt||"";f.elements.cover_symbol.value=p.cover_symbol||"H";f.elements.cover_color.value=p.cover_color||"#dce5d5";f.elements.status.value=p.status||"draft";f.elements.content.value=p.content||"";
    $("editorTitle").textContent="编辑文章";$("deletePostBtn").hidden=false;$("markdownInput").hidden=false;$("markdownPreview").hidden=true;preview=false;message("postMessage","");
  }
  $("postList").addEventListener("click",e=>{const item=e.target.closest("[data-id]");if(item){const p=posts.find(x=>String(x.id)===item.dataset.id);if(p)editPost(p);}});
  $("newPostBtn").addEventListener("click",resetForm);$("resetPostBtn").addEventListener("click",resetForm);
  $("previewToggle").addEventListener("click",()=>{preview=!preview;if(preview){$("markdownPreview").innerHTML=md($("markdownInput").value);$("markdownPreview").hidden=false;$("markdownInput").hidden=true;}else{$("markdownPreview").hidden=true;$("markdownInput").hidden=false;}});
  $("insertHeading").addEventListener("click",()=>insertAtCursor($("markdownInput"),"\n## 小标题\n"));
  $("insertQuote").addEventListener("click",()=>insertAtCursor($("markdownInput"),"\n> 引用内容\n"));
  function insertAtCursor(el,text){const start=el.selectionStart,end=el.selectionEnd;el.setRangeText(text,start,end,"end");el.focus();}
  $("postForm").addEventListener("submit",async e=>{
    e.preventDefault();if(!db||!user)return;const f=e.currentTarget;const fd=new FormData(f);const id=String(fd.get("id")||"");
    const title=String(fd.get("title")||"").trim();const status=String(fd.get("status"));const content=String(fd.get("content")||"");
    const publishedAt=status==="published"?(posts.find(p=>String(p.id)===id)?.published_at||new Date().toISOString()):null;
    const payload={title,slug:slugify(fd.get("slug")||title),category:String(fd.get("category")||"随笔").trim(),tags:String(fd.get("tags")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,20),excerpt:String(fd.get("excerpt")||"").trim(),content,cover_symbol:String(fd.get("cover_symbol")||"H").slice(0,3),cover_color:/^#[0-9a-f]{6}$/i.test(String(fd.get("cover_color")))?String(fd.get("cover_color")):"#dce5d5",status,published_at:publishedAt,updated_at:new Date().toISOString()};
    if(!title||!content){message("postMessage","标题和正文不能为空。",true);return;}
    const btn=f.querySelector('[type="submit"]');btn.disabled=true;message("postMessage","正在保存…");
    let result;
    if(id)result=await db.from("posts").update(payload).eq("id",id);
    else result=await db.from("posts").insert({...payload,author_id:user.id});
    btn.disabled=false;if(result.error){message("postMessage","保存失败："+result.error.message,true);return;}
    message("postMessage","保存成功。");await loadPosts();const fresh=posts.find(p=>p.slug===payload.slug);if(fresh)editPost(fresh);
  });
  $("deletePostBtn").addEventListener("click",async()=>{
    const id=$("postForm").elements.id.value;if(!id||!confirm("确定删除这篇文章？相关评论也会按数据库外键规则删除。"))return;
    const {error}=await db.from("posts").delete().eq("id",id);if(error){message("postMessage","删除失败："+error.message,true);return;}resetForm();await loadPosts();
  });
  async function loadComments(){
    const {data,error}=await db.from("comments").select("id,post_id,nickname,email,content,status,created_at,posts(title)").order("created_at",{ascending:false}).limit(250);
    if(error){$("moderationList").innerHTML=`<p class="message">读取评论失败：${esc(error.message)}</p>`;return;}
    comments=data||[];const pending=comments.filter(c=>c.status==="pending").length;$("pendingCount").textContent=pending?pending:"";
    $("moderationList").innerHTML=comments.map(c=>`<article class="moderation-card"><header><div><strong>${esc(c.nickname)}</strong> <span class="status ${c.status==="approved"?"published":""}">${c.status==="approved"?"已批准":c.status==="rejected"?"已隐藏":"待审核"}</span><br><small>文章：${esc(c.posts?.title||"文章已删除")} · ${new Date(c.created_at).toLocaleString("zh-CN")}${c.email?" · "+esc(c.email):""}</small></div></header><p>${esc(c.content)}</p><div class="moderation-actions">${c.status!=="approved"?`<button class="approve" data-action="approved" data-id="${esc(c.id)}">批准公开</button>`:""}${c.status!=="rejected"?`<button class="hide" data-action="rejected" data-id="${esc(c.id)}">隐藏</button>`:""}<button class="danger" data-action="delete" data-id="${esc(c.id)}">删除</button></div></article>`).join("")||'<p class="empty">目前没有评论。</p>';
  }
  $("moderationList").addEventListener("click",async e=>{
    const b=e.target.closest("[data-action]");if(!b)return;const id=b.dataset.id,action=b.dataset.action;
    if(action==="delete"){if(!confirm("确定永久删除这条评论？"))return;const {error}=await db.from("comments").delete().eq("id",id);if(error){alert("删除失败："+error.message);return;}}
    else {const {error}=await db.from("comments").update({status:action,moderated_at:new Date().toISOString(),moderated_by:user.id}).eq("id",id);if(error){alert("更新失败："+error.message);return;}}
    await loadComments();
  });
  $("refreshComments").addEventListener("click",loadComments);
  document.querySelector(".tabs").addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(!b)return;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));$("postsPane").hidden=b.dataset.tab!=="posts";$("commentsPane").hidden=b.dataset.tab!=="comments";});
  if(db)db.auth.onAuthStateChange(()=>{setTimeout(ensureAdmin,0);});ensureAdmin();
})();