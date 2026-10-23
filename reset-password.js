(() => {
 const cfg=window.BLOG_CONFIG||{};const configured=cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!String(cfg.SUPABASE_ANON_KEY).includes("在这里填入");
 const db=configured&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
 const form=document.getElementById("resetForm"),msg=document.getElementById("resetMessage");
 const say=(s,bad=false)=>{msg.textContent=s;msg.style.color=bad?"#a13f35":"#53684f";};
 if(!db){say("请先配置 config.js。",true);return;}
 // Supabase JS reads the recovery token from the URL hash and emits PASSWORD_RECOVERY.
 let recovery=false;db.auth.onAuthStateChange((event)=>{if(event==="PASSWORD_RECOVERY")recovery=true;});
 form.addEventListener("submit",async e=>{e.preventDefault();const p=form.elements.password.value,c=form.elements.confirm.value;if(p.length<10){say("密码至少需要 10 个字符。",true);return;}if(p!==c){say("两次输入的密码不一致。",true);return;}say("正在更新…");const {error}=await db.auth.updateUser({password:p});if(error){say("更新失败："+error.message,true);return;}say("密码已更新。请前往管理后台使用新密码登录。");form.reset();setTimeout(()=>location.href="admin.html",1800);});
})();