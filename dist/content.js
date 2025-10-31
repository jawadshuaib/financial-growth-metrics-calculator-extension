(()=>{function H(e){return e.trim()!==""&&!Number.isNaN(Number(e))&&Number.isFinite(Number(e))}function L(){const e=document.querySelectorAll(".cagr-pointer-indicator");if(e.length>0){e.forEach((r,c)=>{c>0&&r.remove()});const t=e[0];return t.innerHTML='<span class="cagr-pointer-icon" aria-hidden="true"></span>',t}const n=document.createElement("div");return n.className="cagr-pointer-indicator",n.innerHTML='<span class="cagr-pointer-icon" aria-hidden="true"></span>',document.body.appendChild(n),n}const C=document.createElement("style");C.textContent=`
    tr.clickable-row {
      cursor: default;
    }
    .cagr-highlight-cell {
      background-color: rgba(255, 235, 59, 0.35) !important;
    }
    .cagr-pointer-indicator {
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.65);
      border: 2px solid rgba(22, 163, 74, 0.8);
      box-shadow: 0 0 4px rgba(15, 118, 110, 0.48);
      pointer-events: none;
      z-index: 10001;
      opacity: 0;
      transition: opacity 120ms ease;
    }
    .cagr-pointer-indicator.is-visible {
      opacity: 1;
    }
  `,document.head.appendChild(C);const b=["ttm","ltm","ntm","current","latest","trailing twelve","last twelve","forward","next twelve","mrq"],p=new WeakMap;function A(e){return(e??"").toLowerCase()}function S(e){if(!e)return!1;if(p.has(e))return!!p.get(e);const n=e.tHead?Array.from(e.tHead.querySelectorAll("tr")):Array.from(e.querySelectorAll("tr")),t=[];n.forEach(o=>{const a=Array.from(o.children);if(!a.some(i=>i.tagName==="TH"))return;let s=0;a.forEach(i=>{const l=parseInt(i.getAttribute("colspan")??"1",10)||1;if(i.tagName==="TH"){const h=(i.textContent??"").trim();for(let v=0;v<l;v+=1){const y=s+v;t[y]||(t[y]=[]),h&&t[y].push(h)}}s+=l})});const r=(t[1]??[]).join(" "),c=A(r);let m=b.some(o=>c.includes(o));if(!m){const o=A(Array.from(e.querySelectorAll("th")).map(a=>a.textContent??"").join(" "));m=b.some(a=>o.includes(a))}return p.set(e,m),m}function N(e){if(e.length===0)return null;const n=[...e].sort((r,c)=>r-c),t=Math.floor(n.length/2);return n.length%2?n[t]:(n[t-1]+n[t])/2}function q(e){if(e.length<2)return null;const n=e.length-1,t=e[0],r=e[e.length-1];return t<=0||r<=0?null:Math.pow(r/t,1/n)-1}let f=[],u=!0;const d=L();d.classList.add("is-visible");function T(){return typeof chrome<"u"&&!!chrome.runtime?.id}function k(e){if(!(!u||!T())){try{const n={type:"ROW_HOVER_DATA",payload:e};chrome.runtime.sendMessage(n,()=>{chrome.runtime?.lastError})}catch{return}if(chrome.storage?.local)try{chrome.storage.local.set({lastHoverData:e})}catch{}}}function w(){document.querySelectorAll(".cagr-highlight-cell").forEach(n=>n.classList.remove("cagr-highlight-cell")),f=[]}function D(e){if(!e.length){f=[];return}f=Array.from(new Set(e)),f.forEach(t=>{t.classList.add("cagr-highlight-cell")})}function x(){w()}function g(e){if(!u){d.classList.remove("is-visible");return}d.classList.add("is-visible");const n=10,t=14;d.style.left=`${e.pageX+n}px`,d.style.top=`${e.pageY+t}px`}function M(){u&&(u=!1,d.classList.remove("is-visible"),x(),document.removeEventListener("mousemove",g))}document.addEventListener("mousemove",g,{passive:!0}),document.addEventListener("contextmenu",()=>{M()},{once:!0}),document.querySelectorAll("tr").forEach(e=>{const n=e.querySelectorAll("td"),t=[],r=[],c=e.closest("table"),o=S(c)?2:1,E=e.querySelector("th, td")?.textContent?.trim()??"Metric";if(!(n.length<o+1)){for(let s=o;s<n.length;s+=1){const i=n[s],h=(i.textContent?.trim()??"").replace(/[^0-9.-]+/g,"");H(h)&&(t.push(Number(h)),r.push(i))}if(t.length>1){t.reverse(),e.classList.add("clickable-row");const s=N(t),i=q(t);e.addEventListener("mouseenter",l=>{u&&(x(),D(r),g(l),k({metricName:E,initialValue:t[0]??null,finalValue:t[t.length-1]??null,compoundRate:i,medianValue:s,seriesValues:[...t]}))}),e.addEventListener("mousemove",l=>{u&&g(l)}),e.addEventListener("mouseleave",()=>{x()})}}})})();
