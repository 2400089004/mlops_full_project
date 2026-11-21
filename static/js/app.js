let chart;
const $ = (id) => document.getElementById(id);
function fmtValue(value, unit='') { return value === undefined || value === null ? `— <small>${unit}</small>` : `${value} <small>${unit}</small>`; }
function timeLabel(value) { try { return new Date(value).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return value; } }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function summarizeMeasurements(m) { return Object.entries(m).map(([k,v]) => `${k.replaceAll('_',' ')}: ${v}`).join(' · '); }
function drawChart(labels, values) {
  if (typeof Chart === 'undefined' || !$('historyChart')) return;
  if (chart) chart.destroy();
  chart = new Chart($('historyChart'), {type:'line',data:{labels,datasets:[{label:'Heart rate (bpm)',data:values,borderColor:'#10b7a2',backgroundColor:'rgba(16,183,162,.10)',fill:true,tension:.35,borderWidth:2,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#9aa4b5',font:{size:9},maxTicksLimit:7}},y:{grid:{color:'#eef1f6'},ticks:{color:'#9aa4b5',font:{size:9}},border:{display:false}}}}});
}
function renderRecords(items) {
  if ($('historyBody')) {
    $('historyBody').innerHTML = items.length ? items.map(item => { const m=summarizeMeasurements(item.measurements||{}), n=(item.flags||[]).length; return `<tr><td>${timeLabel(item.created_at)}</td><td title="${escapeHtml(m)}">${escapeHtml(m||'—').slice(0,100)}</td><td><span class="flag-badge ${n?'warn':''}">${n? n+' flag(s)':'No flags'}</span></td></tr>`; }).join('') : '<tr><td colspan="3" class="empty-row">No records yet. Add a demo measurement.</td></tr>';
  }
  const latest=items[0]?.measurements||{};
  if ($('heartRate')) $('heartRate').innerHTML=fmtValue(latest.heart_rate_bpm,'bpm');
  if ($('spo2')) $('spo2').innerHTML=fmtValue(latest.spo2_percent,'%');
  if ($('temperature')) $('temperature').innerHTML=fmtValue(latest.temperature_c,'°C');
  if ($('flagCount')) $('flagCount').innerHTML=fmtValue(items.reduce((n,x)=>n+(x.flags||[]).length,0),'in records');
  if ($('flagCaption')) $('flagCaption').textContent='Flags are not diagnoses';
  const chartItems=[...items].reverse().filter(x=>x.measurements && x.measurements.heart_rate_bpm!==undefined);
  if ($('chartEmpty')) $('chartEmpty').style.display=chartItems.length?'none':'grid';
  drawChart(chartItems.map(x=>timeLabel(x.created_at)),chartItems.map(x=>x.measurements.heart_rate_bpm));
}
async function refreshDashboard() {
  try {
    const [health,ready,history,modelInfo]=await Promise.all([fetch('/health'),fetch('/ready'),fetch('/api/v1/measurements?limit=100'),fetch('/api/v1/models/heart-risk/status')]);
    if(!health.ok||!ready.ok||!history.ok||!modelInfo.ok) throw new Error('API unavailable');
    const r=await ready.json(), h=await history.json(), mi=await modelInfo.json();
    const report=mi.training_report, metrics=report?.metrics||{};
    const pct=(v)=>Number.isFinite(v)?`${(v*100).toFixed(1)}%`:'—';
    if($('heartTrainingStatus')) $('heartTrainingStatus').textContent=mi.available?'Training status: TRAINED':'Training status: NOT TRAINED';
    if($('heartTrainingMessage')) $('heartTrainingMessage').textContent=mi.available?'A trained educational baseline is loaded. Metrics below come from one held-out test split.':'No trained model artifact is available. Run python ml/train_heart_model.py from the project root.';
    if($('heartAccuracy')) $('heartAccuracy').textContent=pct(metrics.accuracy);
    if($('heartBalancedAccuracy')) $('heartBalancedAccuracy').textContent=pct(metrics.balanced_accuracy);
    if($('heartF1')) $('heartF1').textContent=pct(metrics.f1);
    if($('heartRocAuc')) $('heartRocAuc').textContent=pct(metrics.roc_auc);
    if($('apiStatus')) $('apiStatus').textContent='Connected · healthy';
    if($('readyStatus')) $('readyStatus').textContent='Health endpoint responding';
    if($('readyTag')) {$('readyTag').textContent='HEALTHY';$('readyTag').className='status-tag green-tag';}
    if($('modelStatus')) $('modelStatus').textContent=r.heart_model_available?'Artifact loaded':'Train and register a model to enable estimates';
    if($('modelTag')) {$('modelTag').textContent=r.heart_model_available?'AVAILABLE':'NOT TRAINED';$('modelTag').className=r.heart_model_available?'status-tag green-tag':'status-tag';}
    if($('heartModelBtn')) { $('heartModelBtn').disabled=!r.heart_model_available; $('heartModelBtn').textContent=r.heart_model_available?'Run demo inference →':'Model not trained'; }
    if($('heartModelHint')) $('heartModelHint').textContent=r.heart_model_available?'A model artifact is loaded. Use synthetic values only.':'Train the model first. Inference is disabled until artifacts/heart_model.joblib exists.';
    renderRecords(h.items||[]);
  } catch(e) { if($('apiStatus')) $('apiStatus').textContent='Connection issue'; if($('readyStatus')) $('readyStatus').textContent='Could not reach API'; if($('readyTag')) $('readyTag').textContent='OFFLINE'; }
}
const measurementForm=$('measurementForm');
if(measurementForm) measurementForm.addEventListener('submit',async e=>{
 e.preventDefault(); const payload={}; for(const [k,v] of new FormData(measurementForm).entries()) if(v.trim()!=='') payload[k]=Number(v);
 if(!Object.keys(payload).length){$('formResult').textContent='Enter at least one measurement.';$('formResult').className='form-result result-warn';return;}
 const btn=$('submitBtn');btn.disabled=true;btn.textContent='Saving…';
 try{const r=await fetch('/api/v1/measurements/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not save measurement');$('formResult').className=`form-result ${d.flags.length?'result-warn':'result-ok'}`;$('formResult').textContent=d.flags.length?`Saved. ${d.flags.map(x=>`${x.field}: ${x.message}`).join(' ')}`:'Measurement saved. No configured screening flags were raised. This is not confirmation that the reading is medically normal.';measurementForm.reset();await refreshDashboard();}catch(err){$('formResult').textContent=err.message;$('formResult').className='form-result result-warn';}finally{btn.disabled=false;btn.innerHTML='Save measurement <span>→</span>';}
});
if($('refreshBtn')) $('refreshBtn').addEventListener('click',refreshDashboard);
const heartModelForm=$('heartModelForm');
if(heartModelForm) heartModelForm.addEventListener('submit',async e=>{
 e.preventDefault();if($('heartModelBtn')?.disabled){$('heartModelResult').className='form-result result-warn';$('heartModelResult').textContent='The heart disease model is not trained yet. Run the training pipeline before inference.';return;}const payload={};for(const [k,v] of new FormData(heartModelForm).entries())if(v.trim()!=='')payload[k]=Number(v);
 const btn=$('heartModelBtn');btn.disabled=true;btn.textContent='Running model…';$('heartModelResult').textContent='';
 try{const r=await fetch('/api/v1/models/heart-risk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Model inference failed');const out=d.result||{},score=out.estimated_positive_class_score;$('heartModelResult').className='form-result result-warn';$('heartModelResult').textContent=`Demo model output class: ${out.model_output_class}. `+(score==null?'':`Model score: ${(score*100).toFixed(1)}%. `)+'This is an educational model output only—not a diagnosis or clinical probability.';}catch(err){$('heartModelResult').className='form-result result-warn';$('heartModelResult').textContent=err.message;}finally{btn.disabled=false;btn.innerHTML='Run demo inference <span>→</span>';}
});
refreshDashboard();
