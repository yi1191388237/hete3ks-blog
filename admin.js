(() => {
 const cfg=window.BLOG_CONFIG||{}, ready=Boolean(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&window.supabase);
 const db=ready?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
 const $=id=>document.getElementById(id); let currentUser=null, items=[];
 const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function message(id,msg,error=false){$(id).textContent=msg;$(id).style.color=error?"var(--accent)":"var(--muted)"}
 function toast(msg){let el=$("toast");if(!el){el=document.createElement("div");el.id="toast";el.className="toast";document.body.appendChild(el)}el.textContent=msg;el.classList.add("show");clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove("show"),3000)}
 function showLogin(){ $("loginView").hidden=false;$("dashboardView").hidden=true; }
 function showDashboard(){ $("loginView").hidden=true;$("dashboardView").hidden=false;$("sessionLabel").textContent=`已登录：${currentUser?.email||""}`;loadItems(); }
 async function checkSession(){
   if(!ready){message("loginError","请先在 config.js 填入 Supabase URL 和 anon key。",true);$("loginForm").querySelector("button").disabled=true;return;}
   const {data:{session}}=await db.auth.getSession();
   if(session){currentUser=session.user;const {data,error}=await db.rpc("is_blog_admin");if(!error&&data===true)showDashboard();else{await db.auth.signOut();message("loginError","该账号没有管理员权限。请在 Supabase 中授予 admin 角色。",true);showLogin();}}else showLogin();
 }
 $("loginForm").addEventListener("submit",async e=>{
   e.preventDefault();if(!db)return;
   message("loginError","正在验证…");const {data,error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
   if(error){message("loginError","登录失败：邮箱或密码错误，或 Supabase 尚未配置。",true);return;}
   const {data:isAdmin,error:roleError}=await db.rpc("is_blog_admin");
   if(roleError||isAdmin!==true){await db.auth.signOut();message("loginError","账号验证通过，但没有管理员权限。",true);return;}
   currentUser=data.user;message("loginError","");showDashboard();
 });
 $("logoutBtn").addEventListener("click",async()=>{if(db)await db.auth.signOut();currentUser=null;showLogin();});
 function resetForm(){ $("postForm").reset();$("postId").value="";$("coverSymbol").value="H";$("coverColor").value="#dce2d4";$("status").value="draft";$("formTitle").textContent="写一篇新文章";$("saveBtn").textContent="保存文章";message("formMessage","");}
 $("resetBtn").addEventListener("click",resetForm);$("newPostBtn").addEventListener("click",()=>{resetForm();window.scrollTo({top:0,behavior:"smooth"});});
 async function loadItems(){
   const {data,error}=await db.from("posts").select("*").order("updated_at",{ascending:false});
   if(error){$("adminPostList").innerHTML='<p class="error">文章加载失败。请确认已执行 schema.sql 并授予管理员角色。</p>';return;}
   items=data||[];renderItems();
 }
 function renderItems(){
   if(!items.length){$("adminPostList").innerHTML='<p class="admin-muted">还没有文章，点击“新建”开始写作。</p>';return;}
   $("adminPostList").innerHTML=items.map(p=>`<article class="admin-post-item"><h3>${escapeHtml(p.title)}</h3><div class="item-meta"><span>${escapeHtml(p.category||"未分类")}</span><span class="status-pill">${p.status==="published"?"已发布":"草稿"}</span></div><div class="item-actions"><button class="btn-quiet" data-edit="${escapeHtml(p.id)}">编辑</button><button class="btn-quiet" data-delete="${escapeHtml(p.id)}">删除</button>${p.status==="published"?`<a class="btn-quiet" href="./#post/${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">预览</a>`:""}</div></article>`).join("");
 }
 $("adminPostList").addEventListener("click",async e=>{
   const edit=e.target.closest("[data-edit]");if(edit){const p=items.find(x=>x.id===edit.dataset.edit);if(!p)return;
     $("postId").value=p.id;$("title").value=p.title;$("category").value=p.category||"随笔";$("status").value=p.status;$("excerpt").value=p.excerpt||"";$("coverSymbol").value=p.cover_symbol||"H";$("coverColor").value=p.cover_color||"#dce2d4";$("content").value=p.content||"";$("formTitle").textContent="编辑文章";$("saveBtn").textContent="更新文章";message("formMessage","");window.scrollTo({top:0,behavior:"smooth"});return;}
   const del=e.target.closest("[data-delete]");if(del){const p=items.find(x=>x.id===del.dataset.delete);if(!p||!confirm(`确定删除「${p.title}」？此操作无法撤销。`))return;const {error}=await db.from("posts").delete().eq("id",p.id);if(error){toast("删除失败："+error.message);return;}toast("文章已删除");loadItems();}
 });
 function slugify(s){return s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"").slice(0,150)||"post-"+Date.now();}
 $("postForm").addEventListener("submit",async e=>{
   e.preventDefault();if(!db||!currentUser)return;
   const title=$("title").value.trim(), status=$("status").value, id=$("postId").value;
   const payload={title,slug:slugify(title),category:$("category").value,status,excerpt:$("excerpt").value.trim(),cover_symbol:$("coverSymbol").value.trim()||"H",cover_color:$("coverColor").value,content:$("content").value,published_at:status==="published"?new Date().toISOString():null,updated_at:new Date().toISOString()};
   $("saveBtn").disabled=true;$("saveBtn").textContent="正在保存…";message("formMessage","");
   let result;
   if(id)result=await db.from("posts").update(payload).eq("id",id).select().single();
   else result=await db.from("posts").insert({...payload,author_id:currentUser.id}).select().single();
   $("saveBtn").disabled=false;$("saveBtn").textContent=id?"更新文章":"保存文章";
   if(result.error){message("formMessage","保存失败："+result.error.message,true);return;}
   message("formMessage",status==="published"?"文章已保存并发布。":"草稿已保存。");toast("保存成功");resetForm();loadItems();
 });
 checkSession();
})();