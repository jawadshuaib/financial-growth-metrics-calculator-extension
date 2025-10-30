(()=>{function S(t){return t.trim()!==""&&!Number.isNaN(Number(t))&&Number.isFinite(Number(t))}function M(t){const e=document.createElement("div");return e.className="median-cagr-tooltip",e.textContent=t,document.body.appendChild(e),e}function N(){const t=document.querySelectorAll(".cagr-pointer-indicator");if(t.length>0){t.forEach((r,d)=>{d>0&&r.remove()});const n=t[0];return n.innerHTML='<span class="cagr-pointer-icon" aria-hidden="true">🧮</span>',n}const e=document.createElement("div");return e.className="cagr-pointer-indicator",e.innerHTML='<span class="cagr-pointer-icon" aria-hidden="true">🧮</span>',document.body.appendChild(e),e}const A=document.createElement("style");A.textContent=`
    .median-cagr-tooltip {
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 13px;
      pointer-events: none;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
    }
    tr.clickable-row {
      cursor: default;
    }
    .cagr-highlight-cell {
      background-color: rgba(255, 235, 59, 0.45) !important;
    }
    .cagr-pointer-indicator {
      position: absolute;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 6px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.72);
      color: #fefefe;
      font-size: 11px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      pointer-events: none;
      z-index: 10001;
      opacity: 0;
      transition: opacity 120ms ease;
    }
    .cagr-pointer-indicator.is-visible {
      opacity: 1;
    }
    .cagr-pointer-icon {
      font-size: 12px;
      line-height: 1;
    }
  `,document.head.appendChild(A);const H=["ttm","ltm","ntm","current","latest","trailing twelve","last twelve","forward","next twelve","mrq"],C=new WeakMap;function T(t){return(t??"").toLowerCase()}function O(t){if(!t)return!1;if(C.has(t))return!!C.get(t);const e=t.tHead?Array.from(t.tHead.querySelectorAll("tr")):Array.from(t.querySelectorAll("tr")),n=[];e.forEach(s=>{const i=Array.from(s.children);if(!i.some(o=>o.tagName==="TH"))return;let l=0;i.forEach(o=>{const f=parseInt(o.getAttribute("colspan")??"1",10)||1;if(o.tagName==="TH"){const a=(o.textContent??"").trim();for(let m=0;m<f;m+=1){const c=l+m;n[c]||(n[c]=[]),a&&n[c].push(a)}}l+=f})});const r=(n[1]??[]).join(" "),d=T(r);let u=H.some(s=>d.includes(s));if(!u){const s=T(Array.from(t.querySelectorAll("th")).map(i=>i.textContent??"").join(" "));u=H.some(i=>s.includes(i))}return C.set(t,u),u}function k(t){if(t.length===0)return null;const e=[...t].sort((r,d)=>r-d),n=Math.floor(e.length/2);return e.length%2?e[n]:(e[n-1]+e[n])/2}function q(t){if(t.length<2)return null;const e=t.length-1,n=t[0],r=t[t.length-1];return n<=0||r<=0?null:Math.pow(r/n,1/e)-1}let x=null,E=null,v=[],h=!0;const p=N();p.classList.add("is-visible");function z(t){if(h){try{const e={type:"ROW_HOVER_DATA",payload:t};chrome.runtime.sendMessage(e,()=>{chrome.runtime.lastError&&console.warn("Unable to deliver hover data message:",chrome.runtime.lastError.message)})}catch(e){console.warn("Unable to send hover data:",e)}chrome.storage?.local&&chrome.storage.local.set({lastHoverData:t},()=>{chrome.runtime.lastError&&console.warn("Failed to cache hover data:",chrome.runtime.lastError.message)})}}function F(){document.querySelectorAll(".cagr-highlight-cell").forEach(e=>e.classList.remove("cagr-highlight-cell")),v=[]}function D(t){if(!t.length){v=[];return}v=Array.from(new Set(t)),v.forEach(n=>{n.classList.add("cagr-highlight-cell")})}function b(){F(),document.querySelectorAll(".median-cagr-tooltip").forEach(e=>e.remove()),x=null,E=null}function L(t,e){const d=e.clientX+window.scrollX,u=e.clientY+window.scrollY;let s=d+12,i=u-t.offsetHeight-12;const y=document.documentElement.clientWidth||window.innerWidth,l=document.documentElement.clientHeight||window.innerHeight,o=window.scrollX+y-t.offsetWidth-12,f=window.scrollX+12,a=Math.max(f,o);s>a&&(s=a);const m=window.scrollY+12,c=window.scrollY+l-t.offsetHeight-12,g=Math.max(m,c);i<m&&(i=u+12),i>g&&(i=g),t.style.left=`${s}px`,t.style.top=`${i}px`}function w(t){if(!h){p.classList.remove("is-visible");return}p.classList.add("is-visible");const e=10,n=14;p.style.left=`${t.pageX+e}px`,p.style.top=`${t.pageY+n}px`}function I(){h&&(h=!1,p.classList.remove("is-visible"),b(),document.removeEventListener("mousemove",w))}document.addEventListener("mousemove",w,{passive:!0}),document.addEventListener("contextmenu",()=>{I()},{once:!0}),document.querySelectorAll("tr").forEach(t=>{const e=t.querySelectorAll("td"),n=[],r=[],d=t.closest("table"),s=O(d)?2:1,y=t.querySelector("th, td")?.textContent?.trim()??"Metric";if(!(e.length<s+1)){for(let l=s;l<e.length;l+=1){const o=e[l],a=(o.textContent?.trim()??"").replace(/[^0-9.-]+/g,"");S(a)&&(n.push(Number(a)),r.push(o))}if(n.length>1){n.reverse(),t.classList.add("clickable-row");const l=k(n),o=q(n),f=l!==null?`Median: ${l.toFixed(2)}`:"Median: N/A",a=o!==null?`CAGR: ${(o*100).toFixed(2)}%`:"CAGR: N/A",m=`${f}
${a}`;t.addEventListener("mouseenter",c=>{if(!h)return;b();const g=M(m);x=g,E=t,L(g,c),D(r),w(c),z({metricName:y,initialValue:n[0]??null,finalValue:n[n.length-1]??null,compoundRate:o,medianValue:l})}),t.addEventListener("mousemove",c=>{h&&(x&&E===t&&L(x,c),w(c))}),t.addEventListener("mouseleave",()=>{b()})}}})})();
