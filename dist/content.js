(()=>{function H(e){return e.trim()!==""&&!Number.isNaN(Number(e))&&Number.isFinite(Number(e))}function L(){const e=document.querySelectorAll(".cagr-pointer-indicator");if(e.length>0){e.forEach((r,a)=>{a>0&&r.remove()});const n=e[0];return n.innerHTML='<span class="cagr-pointer-icon" aria-hidden="true"></span>',n}const t=document.createElement("div");return t.className="cagr-pointer-indicator",t.innerHTML='<span class="cagr-pointer-icon" aria-hidden="true"></span>',document.body.appendChild(t),t}const y=document.createElement("style");y.textContent=`
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
  `,document.head.appendChild(y);const b=["ttm","ltm","ntm","current","latest","trailing twelve","last twelve","forward","next twelve","mrq"],p=new WeakMap;function E(e){return(e??"").toLowerCase()}function S(e){if(!e)return!1;if(p.has(e))return!!p.get(e);const t=e.tHead?Array.from(e.tHead.querySelectorAll("tr")):Array.from(e.querySelectorAll("tr")),n=[];t.forEach(i=>{const c=Array.from(i.children);if(!c.some(o=>o.tagName==="TH"))return;let s=0;c.forEach(o=>{const l=parseInt(o.getAttribute("colspan")??"1",10)||1;if(o.tagName==="TH"){const h=(o.textContent??"").trim();for(let v=0;v<l;v+=1){const C=s+v;n[C]||(n[C]=[]),h&&n[C].push(h)}}s+=l})});const r=(n[1]??[]).join(" "),a=E(r);let m=b.some(i=>a.includes(i));if(!m){const i=E(Array.from(e.querySelectorAll("th")).map(c=>c.textContent??"").join(" "));m=b.some(c=>i.includes(c))}return p.set(e,m),m}function w(e){if(e.length===0)return null;const t=[...e].sort((r,a)=>r-a),n=Math.floor(t.length/2);return t.length%2?t[n]:(t[n-1]+t[n])/2}function N(e){if(e.length<2)return null;const t=e.length-1,n=e[0],r=e[e.length-1];return n<=0||r<=0?null:Math.pow(r/n,1/t)-1}let g=[],u=!0;const d=L();d.classList.add("is-visible");function q(e){if(u){try{const t={type:"ROW_HOVER_DATA",payload:e};chrome.runtime.sendMessage(t,()=>{chrome.runtime.lastError&&console.warn("Unable to deliver hover data message:",chrome.runtime.lastError.message)})}catch(t){console.warn("Unable to send hover data:",t)}chrome.storage?.local&&chrome.storage.local.set({lastHoverData:e},()=>{chrome.runtime.lastError&&console.warn("Failed to cache hover data:",chrome.runtime.lastError.message)})}}function T(){document.querySelectorAll(".cagr-highlight-cell").forEach(t=>t.classList.remove("cagr-highlight-cell")),g=[]}function k(e){if(!e.length){g=[];return}g=Array.from(new Set(e)),g.forEach(n=>{n.classList.add("cagr-highlight-cell")})}function x(){T()}function f(e){if(!u){d.classList.remove("is-visible");return}d.classList.add("is-visible");const t=10,n=14;d.style.left=`${e.pageX+t}px`,d.style.top=`${e.pageY+n}px`}function D(){u&&(u=!1,d.classList.remove("is-visible"),x(),document.removeEventListener("mousemove",f))}document.addEventListener("mousemove",f,{passive:!0}),document.addEventListener("contextmenu",()=>{D()},{once:!0}),document.querySelectorAll("tr").forEach(e=>{const t=e.querySelectorAll("td"),n=[],r=[],a=e.closest("table"),i=S(a)?2:1,A=e.querySelector("th, td")?.textContent?.trim()??"Metric";if(!(t.length<i+1)){for(let s=i;s<t.length;s+=1){const o=t[s],h=(o.textContent?.trim()??"").replace(/[^0-9.-]+/g,"");H(h)&&(n.push(Number(h)),r.push(o))}if(n.length>1){n.reverse(),e.classList.add("clickable-row");const s=w(n),o=N(n);e.addEventListener("mouseenter",l=>{u&&(x(),k(r),f(l),q({metricName:A,initialValue:n[0]??null,finalValue:n[n.length-1]??null,compoundRate:o,medianValue:s}))}),e.addEventListener("mousemove",l=>{u&&f(l)}),e.addEventListener("mouseleave",()=>{x()})}}})})();
