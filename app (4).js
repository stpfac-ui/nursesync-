// ============================================================
//  NurseSync — app.js  (browser only, no server code here)
// ============================================================

// ── config: stored in browser localStorage (not GAS) ───────
function conf(k, v) {
  if (v !== undefined) localStorage.setItem('ns_' + k, v);
  return localStorage.getItem('ns_' + k) || '';
}

// ── state ───────────────────────────────────────────────────
var role = 'admin';
var me   = null;
var sched = {};   // key: "nurseId|YYYY-MM-DD" → shift code
var CH = {};      // chart instances
var autoResult = {};

// ── users ───────────────────────────────────────────────────
var USERS = [
  { id:'admin001', pass:'1234', role:'admin', name:'ผู้ดูแลระบบ',      dept:'IT'    },
  { id:'head001',  pass:'1234', role:'head',  name:'พว.สุภาพร มั่นคง', dept:'ICU'   },
  { id:'nurse001', pass:'1234', role:'nurse', name:'พว.นภา สายใจ',     dept:'Ward A'},
];

// ── staff ───────────────────────────────────────────────────
var staff = [
  {id:'N001',pfx:'นาง',   f:'สุภาพร', l:'มั่นคง',   pos:'หัวหน้าหอผู้ป่วย',dept:'ICU',   lvl:'SRN',ph:'081-234-5678',em:'supaporn@hosp.com', st:'ปฏิบัติงาน',sh:20},
  {id:'N002',pfx:'นางสาว',f:'นภา',    l:'สายใจ',    pos:'พยาบาลวิชาชีพ',  dept:'Ward A',lvl:'RN', ph:'082-345-6789',em:'napa@hosp.com',      st:'ปฏิบัติงาน',sh:18},
  {id:'N003',pfx:'นาง',   f:'มาลี',   l:'ใจดี',     pos:'พยาบาลวิชาชีพ',  dept:'ICU',   lvl:'RN', ph:'083-456-7890',em:'malee@hosp.com',     st:'ปฏิบัติงาน',sh:22},
  {id:'N004',pfx:'นางสาว',f:'ปัทมา',  l:'รักดี',    pos:'พยาบาลวิชาชีพ',  dept:'ER',    lvl:'RN', ph:'084-567-8901',em:'patama@hosp.com',    st:'ปฏิบัติงาน',sh:19},
  {id:'N005',pfx:'นาง',   f:'รัตนา',  l:'แสงทอง',  pos:'พยาบาลวิชาชีพ',  dept:'Ward B',lvl:'RN', ph:'085-678-9012',em:'ratana@hosp.com',    st:'ปฏิบัติงาน',sh:17},
  {id:'N006',pfx:'นางสาว',f:'กาญจนา', l:'ศรีสุข',  pos:'ผู้ช่วยพยาบาล',  dept:'OPD',   lvl:'CN', ph:'086-789-0123',em:'kanya@hosp.com',     st:'ปฏิบัติงาน',sh:15},
  {id:'N007',pfx:'นาย',   f:'ธีรพล',  l:'วงศ์ดี',  pos:'พยาบาลวิชาชีพ',  dept:'OR',    lvl:'RN', ph:'087-890-1234',em:'theerapol@hosp.com', st:'ปฏิบัติงาน',sh:21},
  {id:'N008',pfx:'นางสาว',f:'วรรณา',  l:'ทองใส',   pos:'พยาบาลวิชาชีพ',  dept:'ICU',   lvl:'RN', ph:'088-901-2345',em:'wanna@hosp.com',     st:'ลาพักร้อน', sh:12},
  {id:'N009',pfx:'นาง',   f:'สมจิตร', l:'พลอยงาม', pos:'พยาบาลวิชาชีพ',  dept:'Ward A',lvl:'RN', ph:'089-012-3456',em:'somjit@hosp.com',    st:'ปฏิบัติงาน',sh:20},
  {id:'N010',pfx:'นางสาว',f:'อรุณี',  l:'สุขสันต์',pos:'พยาบาลวิชาชีพ',  dept:'ER',    lvl:'RN', ph:'081-123-4567',em:'arunee@hosp.com',    st:'ปฏิบัติงาน',sh:18},
];

// ── leaves ──────────────────────────────────────────────────
var leaves = [
  {id:'L001',nId:'N008',name:'พว.วรรณา ทองใส',   type:'ลาพักร้อน',s:'2025-06-10',e:'2025-06-20',days:9, st:'อนุมัติ'},
  {id:'L002',nId:'N003',name:'พว.มาลี ใจดี',     type:'ลาป่วย',   s:'2025-06-18',e:'2025-06-19',days:2, st:'อนุมัติ'},
  {id:'L003',nId:'N005',name:'พว.รัตนา แสงทอง', type:'ลากิจ',    s:'2025-06-25',e:'2025-06-25',days:1, st:'รออนุมัติ'},
  {id:'L004',nId:'N002',name:'พว.นภา สายใจ',     type:'ลาคลอด',  s:'2025-07-01',e:'2025-09-30',days:90,st:'รออนุมัติ'},
];

// ── swaps ────────────────────────────────────────────────────
var swaps = [
  {id:'S001',req:'พว.นภา สายใจ',   fd:'2025-06-26',fs:'N',tgt:'พว.มาลี ใจดี',      td:'2025-06-28',ts:'M',sub:'2025-06-20',st:'รออนุมัติ'},
  {id:'S002',req:'พว.ปัทมา รักดี', fd:'2025-06-27',fs:'A',tgt:'พว.รัตนา แสงทอง', td:'2025-06-29',ts:'A',sub:'2025-06-21',st:'รออนุมัติ'},
  {id:'S003',req:'พว.มาลี ใจดี',   fd:'2025-06-15',fs:'M',tgt:'พว.สมจิตร พลอยงาม',td:'2025-06-16',ts:'M',sub:'2025-06-12',st:'อนุมัติ'},
];

// ── shift types ──────────────────────────────────────────────
var shiftTypes = [
  {code:'M',name:'เวรเช้า (Morning)',    s:'06:00',e:'14:00',h:8, col:'#2563b8'},
  {code:'A',name:'เวรบ่าย (Afternoon)', s:'14:00',e:'22:00',h:8, col:'#d97706'},
  {code:'N',name:'เวรดึก (Night)',       s:'22:00',e:'06:00',h:8, col:'#7c3aed'},
  {code:'O',name:'On Call',              s:'00:00',e:'23:59',h:12,col:'#dc2626'},
];

// ── notifications ────────────────────────────────────────────
var notifs = [
  {id:'NT1',type:'shift', msg:'คุณมีเวรดึกพรุ่งนี้ (27 มิ.ย.) — Ward A',             time:'2 ชม.ที่แล้ว', read:false},
  {id:'NT2',type:'swap',  msg:'พว.นภา ขอแลกเวรกับคุณ วันที่ 28 มิ.ย.',              time:'3 ชม.ที่แล้ว', read:false},
  {id:'NT3',type:'leave', msg:'คำขอลาของ พว.วรรณา ได้รับอนุมัติแล้ว',               time:'1 วันที่แล้ว', read:true},
  {id:'NT4',type:'system',msg:'ระบบจัดตารางเวรเดือน ก.ค. เสร็จสิ้นแล้ว',           time:'1 วันที่แล้ว', read:true},
];

var activities = [
  {icon:'fa-user-plus',      col:'var(--green)',   msg:'เพิ่มพยาบาล: พว.กาญจนา ศรีสุข', time:'10:32'},
  {icon:'fa-calendar-check', col:'var(--blue2)',   msg:'จัดตารางเวร ก.ค. เสร็จสิ้น',    time:'09:15'},
  {icon:'fa-arrows-rotate',  col:'var(--amber)',   msg:'ขอแลกเวร: พว.นภา ↔ พว.มาลี',   time:'08:45'},
  {icon:'fa-bell',           col:'var(--teal)',    msg:'แจ้งเตือนเวรพรุ่งนี้ 36 คน',    time:'08:00'},
  {icon:'fa-calendar-xmark', col:'var(--red)',     msg:'พว.รัตนา ขอลากิจ 25 มิ.ย.',     time:'เมื่อวาน'},
];

// ── GAS Code string (for display/copy only) ─────────────────
var GAS_CODE = '// ดูไฟล์ Code.gs ที่ดาวน์โหลดมาพร้อมกัน\n// วางทั้งหมดใน Google Apps Script\n// แล้ว Deploy > New Deployment > Web App\n// Execute as: Me\n// Who has access: Anyone\n// จากนั้นนำ URL มาใส่ในช่องด้านขวา';

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  buildSampleSched();
  tick();
  setInterval(tick, 60000);
  fillMonthSel();
  restoreConf();
  document.getElementById('gasPreview').textContent = GAS_CODE;
  // close modals on backdrop click
  document.querySelectorAll('.moverlay').forEach(function(o) {
    o.addEventListener('click', function(e){ if(e.target===o) o.classList.remove('on'); });
  });
});

function tick() {
  var now = new Date();
  var el = document.getElementById('tbDate');
  if (el) el.textContent = now.toLocaleDateString('th-TH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

function fillMonthSel() {
  var mn = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  var sel = document.getElementById('schMonth');
  if (!sel) return;
  mn.forEach(function(m,i) {
    var opt = document.createElement('option');
    opt.value = '2025-' + String(i+1).padStart(2,'0');
    opt.textContent = m + ' 2568';
    if (i===5) opt.selected = true;
    sel.appendChild(opt);
  });
}

function restoreConf() {
  var url = conf('gasUrl');
  var sid = conf('sheetId');
  var em  = conf('email') || 'stpfac@gmail.com';
  if (url) document.getElementById('gasUrl').value = url;
  if (sid) document.getElementById('sheetId').value = sid;
  document.getElementById('gEmail').value = em;
}

// ── build sample schedule ────────────────────────────────────
function buildSampleSched() {
  var codes = ['M','A','N','M','A','off','off'];
  for (var d=1; d<=30; d++) {
    var dow = new Date(2025,5,d).getDay();
    staff.forEach(function(n,ni) {
      var date = '2025-06-' + String(d).padStart(2,'0');
      var k = n.id + '|' + date;
      var isWE = dow===0 || dow===6;
      if (isWE && (ni+Math.floor(d/7))%2===0) { sched[k]='off'; return; }
      sched[k] = codes[(ni+d)%codes.length] || 'M';
      if (sched[k]==='off' && !isWE) sched[k] = codes[(ni+d)%4];
    });
  }
  // apply approved leaves
  leaves.forEach(function(lv) {
    if (lv.st !== 'อนุมัติ') return;
    var cur = new Date(lv.s);
    var end = new Date(lv.e);
    while (cur <= end) {
      var dt = cur.toISOString().split('T')[0];
      sched[lv.nId + '|' + dt] = 'leave';
      cur.setDate(cur.getDate()+1);
    }
  });
}

// ════════════════════════════════════════════════════════════
//  LOGIN / LOGOUT
// ════════════════════════════════════════════════════════════
function selRole(r, el) {
  role = r;
  document.querySelectorAll('.rbtn').forEach(function(b){ b.classList.remove('on'); });
  el.classList.add('on');
  var demos = {admin:'admin001', head:'head001', nurse:'nurse001'};
  document.getElementById('lu').value = demos[r];
}

function doLogin() {
  var uid = document.getElementById('lu').value.trim();
  var pwd = document.getElementById('lp').value;
  var u = USERS.find(function(x){ return x.id===uid && x.pass===pwd; });
  if (!u) { toast('รหัสไม่ถูกต้อง','e'); return; }
  me = u; role = u.role;
  showLoad();
  setTimeout(function() {
    document.getElementById('login').style.display='none';
    document.getElementById('app').style.display='block';
    var init = u.name[0] || 'A';
    setEl('sbAv', init); setEl('tbAv', init);
    setEl('sbName', u.name);
    setEl('sbRole', {admin:'ผู้ดูแลระบบ',head:'หัวหน้าหอผู้ป่วย',nurse:'พยาบาล'}[u.role]);
    applyRoleNav();
    initDash();
    renderStaff(); renderSchedule(); renderLeaves(); renderSwaps(); renderTypes(); renderNotifs();
    fillNurseSelects();
    hideLoad();
    go('dashboard', null);
    toast('ยินดีต้อนรับ ' + u.name + ' 🏥', 's');
  }, 700);
}

function doLogout() {
  if (!confirm('ออกจากระบบ?')) return;
  me = null;
  document.getElementById('app').style.display='none';
  document.getElementById('login').style.display='flex';
  Object.values(CH).forEach(function(c){ if(c&&c.destroy) c.destroy(); });
  CH = {};
}

function applyRoleNav() {
  if (role==='nurse') {
    ['จัดเวรอัตโนมัติ','ข้อมูลพยาบาล','รายงาน','AI วิเคราะห์','ประเภทเวร','Google Sheets'].forEach(function(t){
      document.querySelectorAll('.ni').forEach(function(el){
        if(el.textContent.trim().includes(t)) el.style.display='none';
      });
    });
  }
}

// ════════════════════════════════════════════════════════════
//  ROUTING
// ════════════════════════════════════════════════════════════
var titles = {dashboard:'Dashboard',schedule:'ตารางเวร',auto:'จัดเวรอัตโนมัติ',
  staff:'ข้อมูลพยาบาล',leave:'การลา',swap:'ขอแลกเวร',notify:'การแจ้งเตือน',
  reports:'รายงาน',ai:'AI วิเคราะห์',types:'ประเภทเวร',setup:'Google Sheets'};

function go(pageId, navEl) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('on'); });
  var pg = document.getElementById('pg-'+pageId);
  if (pg) pg.classList.add('on');
  document.querySelectorAll('.ni').forEach(function(n){ n.classList.remove('on'); });
  if (navEl) navEl.classList.add('on');
  setEl('tbTitle', titles[pageId] || pageId);
  if (pageId==='reports') renderReportCharts();
  if (pageId==='ai')      renderAIPage();
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════
function initDash() {
  renderHeatmap();
  renderFeed();
  renderAIMain();
  setTimeout(function(){ renderPie(); renderWeekly(); }, 100);
}

function renderHeatmap() {
  var g = document.getElementById('hmap');
  if (!g) return;
  g.innerHTML = '';
  var first = new Date(2025,5,1).getDay();
  for (var i=0;i<first;i++) {
    var b=document.createElement('div'); b.style.aspectRatio='1'; g.appendChild(b);
  }
  for (var d=1;d<=30;d++) {
    var lv = Math.floor(Math.random()*6);
    var c = document.createElement('div');
    c.className = 'hcell h'+lv;
    c.textContent = d;
    c.title = d+' มิ.ย. — ภาระงาน: '+(lv*20)+'%';
    g.appendChild(c);
  }
}

function renderFeed() {
  var el = document.getElementById('actFeed');
  if (!el) return;
  el.innerHTML = activities.map(function(a){
    return '<div style="display:flex;align-items:flex-start;gap:11px;padding:11px 16px;border-bottom:1px solid var(--border)">'
      +'<div style="width:30px;height:30px;border-radius:7px;background:'+a.col+'20;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      +'<i class="fa-solid '+a.icon+'" style="color:'+a.col+';font-size:.82rem"></i></div>'
      +'<div><div style="font-size:.83rem">'+a.msg+'</div><div style="font-size:.72rem;color:var(--text3);margin-top:2px">'+a.time+'</div></div></div>';
  }).join('');
}

function renderAIMain() {
  var el = document.getElementById('aiMain');
  if (!el) return;
  var rows = [
    'พว.มาลี ใจดี มีเวรดึก 4 วันติดต่อกัน (22-25 มิ.ย.) — ควรจัดพักอย่างน้อย 1 วัน',
    'แผนก ICU มีกำลังคนต่ำกว่าเกณฑ์วันที่ 28 มิ.ย. (มี 3 คน จำเป็น 4 คน)',
    'ภาระงานรวม RN เกินมาตรฐาน เฉลี่ย 22.4 ชม./คน/สัปดาห์',
  ];
  el.innerHTML = rows.map(function(r){
    return '<div class="airow"><i class="fa-solid fa-triangle-exclamation"></i><span>'+r+'</span></div>';
  }).join('');
}

function renderPie() {
  var ctx = document.getElementById('chPie');
  if (!ctx) return;
  if (CH.pie) CH.pie.destroy();
  CH.pie = new Chart(ctx, {
    type:'doughnut',
    data:{ labels:['เวรเช้า','เวรบ่าย','เวรดึก','On Call'],
      datasets:[{data:[14,12,8,2],backgroundColor:['#2563b8','#d97706','#7c3aed','#dc2626'],borderWidth:2,borderColor:'#fff'}]},
    options:{cutout:'68%',plugins:{legend:{display:false}},responsive:false}
  });
}

function renderWeekly() {
  var ctx = document.getElementById('chWeek');
  if (!ctx) return;
  if (CH.week) CH.week.destroy();
  CH.week = new Chart(ctx, {
    type:'bar',
    data:{labels:['จ','อ','พ','พฤ','ศ','ส','อา'],
      datasets:[
        {label:'เช้า', data:[12,13,12,14,12,8,6], backgroundColor:'rgba(37,99,184,.7)',borderRadius:4},
        {label:'บ่าย', data:[10,11,10,11,10,7,5], backgroundColor:'rgba(217,119,6,.7)', borderRadius:4},
        {label:'ดึก',  data:[7,8,7,8,7,5,4],      backgroundColor:'rgba(124,58,237,.7)',borderRadius:4},
      ]},
    options:{responsive:true,scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'#f1f5f9'}}},
      plugins:{legend:{position:'bottom',labels:{font:{family:'Sarabun'}}}}}
  });
}

// ════════════════════════════════════════════════════════════
//  SCHEDULE
// ════════════════════════════════════════════════════════════
function renderSchedule() {
  var mv  = document.getElementById('schMonth') ? document.getElementById('schMonth').value : '2025-06';
  var yr  = parseInt(mv.split('-')[0]);
  var mo  = parseInt(mv.split('-')[1]);
  var dim = new Date(yr, mo, 0).getDate();
  var fd  = document.getElementById('fDept')  ? document.getElementById('fDept').value  : '';
  var fs  = document.getElementById('fShift') ? document.getElementById('fShift').value : '';
  var list = fd ? staff.filter(function(s){ return s.dept===fd; }) : staff;

  // head
  var head = document.getElementById('schHead');
  if (!head) return;
  var days = ['อา','จ','อ','พ','พฤ','ศ','ส'];
  var hhtml = '<tr><th style="position:sticky;left:0;z-index:2">พยาบาล</th><th>แผนก</th>';
  for (var d=1;d<=dim;d++) {
    var isWE = new Date(yr,mo-1,d).getDay()%6===0;
    hhtml += '<th style="'+(isWE?'background:#162f6a;':'')+'">' + d + '<br><span style="font-weight:400;opacity:.7">'+days[new Date(yr,mo-1,d).getDay()]+'</span></th>';
  }
  hhtml += '<th>รวม</th></tr>';
  head.innerHTML = hhtml;

  // body
  var body = document.getElementById('schBody');
  if (!body) return;
  body.innerHTML = list.map(function(n) {
    var tot=0, ni=0, cells='';
    for (var d=1;d<=dim;d++) {
      var date = yr+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      var sv = sched[n.id+'|'+date] || 'off';
      if (fs && sv!==fs) sv='off';
      if (sv!=='off'&&sv!=='leave') { tot++; if(sv==='N') ni++; }
      var lbl={M:'M',A:'A',N:'N',O:'OC',off:'-',leave:'L'}[sv]||sv;
      var cls = sv==='leave' ? 'cleave' : 'c'+sv;
      cells += '<td><span class="chip '+cls+'" onclick="toggleShift(\''+n.id+'\',\''+date+'\',\''+sv+'\')" title="'+shiftName(sv)+'">'+lbl+'</span></td>';
    }
    return '<tr>'
      +'<td class="nn" style="background:#fff"><div style="display:flex;align-items:center;gap:7px">'
      +'<div class="av">'+n.f[0]+'</div><div><div style="font-size:.83rem">'+n.pfx+n.f+' '+n.l+'</div>'
      +'<div style="font-size:.7rem;color:var(--text3)">ดึก '+ni+' วัน</div></div></div></td>'
      +'<td><span class="badge bb">'+n.dept+'</span></td>'
      +cells
      +'<td style="font-weight:700;color:var(--blue2)">'+tot+'</td></tr>';
  }).join('');
}

function shiftName(c) {
  return {M:'เวรเช้า 06-14',A:'เวรบ่าย 14-22',N:'เวรดึก 22-06',O:'On Call',off:'หยุด',leave:'ลา'}[c]||c;
}

function toggleShift(nId, date, cur) {
  if (role==='nurse') return;
  var seq = ['M','A','N','O','off','leave'];
  var next = seq[(seq.indexOf(cur)+1)%seq.length];
  sched[nId+'|'+date] = next;
  renderSchedule();
}

function addShift() {
  var nId = document.getElementById('shNurse').value;
  var dt  = document.getElementById('shDate').value;
  var typ = document.getElementById('shType').value;
  if (!nId||!dt) { toast('กรุณากรอกข้อมูล','e'); return; }
  sched[nId+'|'+dt] = typ;
  closeM('mAddShift');
  renderSchedule();
  toast('บันทึกเวรสำเร็จ','s');
  syncNow();
}

// ════════════════════════════════════════════════════════════
//  AUTO SCHEDULE
// ════════════════════════════════════════════════════════════
function runAuto() {
  showLoad();
  setTimeout(function() {
    var mv = document.getElementById('autoMo').value || '2025-07';
    var yr = parseInt(mv.split('-')[0]);
    var mo = parseInt(mv.split('-')[1]);
    var dim = new Date(yr,mo,0).getDate();
    var maxNi  = parseInt(document.getElementById('maxNi').value)||8;
    var restNi = parseInt(document.getElementById('restN').value)||1;
    var dept   = document.getElementById('autoDept').value;
    var list   = dept ? staff.filter(function(s){ return s.dept===dept; }) : staff;
    var codes  = ['M','A','N'];
    autoResult = {};

    list.forEach(function(n,ni) {
      var nightCnt=0, lastNight=false, consec=0;
      for (var d=1;d<=dim;d++) {
        var date = yr+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
        var k = n.id+'|'+date;
        var dow = new Date(yr,mo-1,d).getDay();
        // leave?
        var onLv = leaves.some(function(lv){
          return lv.nId===n.id && lv.st==='อนุมัติ' && new Date(lv.s)<=new Date(date) && new Date(date)<=new Date(lv.e);
        });
        if (onLv) { autoResult[k]='leave'; lastNight=false; consec=0; continue; }
        // rest after night
        if (lastNight && restNi>0) { autoResult[k]='off'; lastNight=false; consec=0; continue; }
        // weekend rotation
        if ((dow===0||dow===6) && (ni+Math.floor(d/7))%2===0) { autoResult[k]='off'; consec=0; continue; }
        // max consec
        if (consec>=6) { autoResult[k]='off'; consec=0; continue; }
        var sh = codes[(ni*7+d)%3];
        if (sh==='N' && nightCnt>=maxNi) sh='M';
        autoResult[k]=sh;
        if (sh==='N'){ nightCnt++; lastNight=true; } else lastNight=false;
        consec++;
      }
    });

    // render
    var card = document.getElementById('autoResult');
    if (card) card.style.display='block';
    var head = document.getElementById('autoHead');
    var body = document.getElementById('autoBody');
    if (!head||!body) { hideLoad(); return; }

    var days=['อา','จ','อ','พ','พฤ','ศ','ส'];
    var hhtml='<tr><th style="position:sticky;left:0">พยาบาล</th>';
    for(var d=1;d<=dim;d++) hhtml+='<th>'+d+'<br><small style="font-weight:400;opacity:.7">'+days[new Date(yr,mo-1,d).getDay()]+'</small></th>';
    hhtml+='<th>รวม</th></tr>';
    head.innerHTML=hhtml;

    body.innerHTML=list.map(function(n){
      var tot=0,cells='';
      for(var d=1;d<=dim;d++){
        var date=yr+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
        var sv=autoResult[n.id+'|'+date]||'off';
        if(sv!=='off'&&sv!=='leave') tot++;
        var lbl={M:'M',A:'A',N:'N',O:'OC',off:'-',leave:'L'}[sv]||sv;
        var cls=sv==='leave'?'cleave':'c'+sv;
        cells+='<td><span class="chip '+cls+'">'+lbl+'</span></td>';
      }
      return '<tr><td class="nn" style="background:#fff">'+n.pfx+n.f+' '+n.l+'</td>'+cells+'<td style="font-weight:700">'+tot+'</td></tr>';
    }).join('');

    hideLoad();
    toast('✨ AI จัดตารางเสร็จ! ตรวจสอบแล้วกด "นำไปใช้"','s');
    card.scrollIntoView({behavior:'smooth'});
  }, 1000);
}

function applyAuto() {
  if (!Object.keys(autoResult).length) return;
  Object.assign(sched, autoResult);
  renderSchedule();
  go('schedule', null);
  toast('นำตารางเวรไปใช้งานแล้ว','s');
  syncNow();
}

// ════════════════════════════════════════════════════════════
//  STAFF
// ════════════════════════════════════════════════════════════
function renderStaff() {
  var q = (document.getElementById('stSearch')||{value:''}).value.toLowerCase();
  var list = q ? staff.filter(function(s){ return (s.f+s.l+s.id).toLowerCase().includes(q); }) : staff;
  var body = document.getElementById('stBody');
  if (!body) return;
  body.innerHTML = list.map(function(s){
    var stCls = {ปฏิบัติงาน:'bg',ลาพักร้อน:'ba',ลาออก:'br'}[s.st]||'bgr';
    return '<tr>'
      +'<td><code style="font-family:\'IBM Plex Mono\';font-size:.8rem">'+s.id+'</code></td>'
      +'<td><div style="display:flex;align-items:center;gap:7px"><div class="av">'+s.f[0]+'</div>'
      +'<div><div style="font-weight:600;font-size:.88rem">'+s.pfx+s.f+' '+s.l+'</div>'
      +'<div style="font-size:.72rem;color:var(--text3)">'+s.em+'</div></div></div></td>'
      +'<td>'+s.pos+'</td><td><span class="badge bb">'+s.dept+'</span></td>'
      +'<td><span class="badge bp">'+s.lvl+'</span></td><td>'+s.ph+'</td>'
      +'<td><span class="badge '+stCls+'">'+s.st+'</span></td>'
      +'<td><div style="display:flex;align-items:center;gap:6px"><b style="font-family:\'IBM Plex Mono\'">'+s.sh+'</b>'
      +'<div style="flex:1;min-width:50px"><div class="pbw"><div class="pb" style="width:'+Math.min(100,(s.sh/22)*100)+'%"></div></div></div></div></td>'
      +'<td><div class="fl g2">'
      +'<button class="btn bline bsm" onclick="editStaff(\''+s.id+'\')"><i class="fa-solid fa-pen"></i></button>'
      +'<button class="btn bghost bsm" onclick="delStaff(\''+s.id+'\')"><i class="fa-solid fa-trash" style="color:var(--red)"></i></button>'
      +'</div></td></tr>';
  }).join('');
}

function addStaff() {
  var id=v('sId'), f=v('sF'), l=v('sL');
  if(!id||!f||!l){ toast('กรุณากรอกรหัส ชื่อ นามสกุล','e'); return; }
  if(staff.find(function(s){ return s.id===id; })){ toast('รหัสซ้ำ','e'); return; }
  staff.push({id,pfx:v('sPfx'),f,l,pos:v('sPos'),dept:v('sDept'),lvl:v('sLvl'),ph:v('sPh'),em:v('sEm'),st:v('sSt'),sh:0});
  closeM('mStaff');
  renderStaff(); fillNurseSelects();
  toast('เพิ่ม '+v('sPfx')+f+' '+l+' สำเร็จ','s');
  syncNow();
}

function editStaff(id) { toast('แก้ไข ID: '+id+' (เปิดฟอร์ม)','info'); }

function delStaff(id) {
  var s=staff.find(function(x){ return x.id===id; });
  if(!s||!confirm('ลบ '+s.pfx+s.f+' '+s.l+'?')) return;
  staff=staff.filter(function(x){ return x.id!==id; });
  renderStaff(); toast('ลบสำเร็จ','s');
}

// ════════════════════════════════════════════════════════════
//  LEAVE
// ════════════════════════════════════════════════════════════
function renderLeaves() {
  var body=document.getElementById('lvBody');
  if(!body) return;
  body.innerHTML=leaves.map(function(lv){
    var cls={อนุมัติ:'bg',ปฏิเสธ:'br',รออนุมัติ:'ba'}[lv.st]||'bgr';
    var tc={ลาพักร้อน:'bt',ลาป่วย:'br',ลากิจ:'ba',ลาคลอด:'bp'}[lv.type]||'bgr';
    var btns='';
    if(lv.st==='รออนุมัติ'&&role!=='nurse')
      btns='<button class="btn bgreen bsm" onclick="approveLv(\''+lv.id+'\')"><i class="fa-solid fa-check"></i>อนุมัติ</button>'
          +'<button class="btn bred bsm" onclick="rejectLv(\''+lv.id+'\')"><i class="fa-solid fa-xmark"></i></button>';
    return '<tr><td><div class="fl ic g2"><div class="av">'+(lv.name.split('').find(function(c){ return c.match(/[ก-ฮ]/); })||'N')+'</div>'+lv.name+'</div></td>'
      +'<td><span class="badge '+tc+'">'+lv.type+'</span></td>'
      +'<td>'+thDate(lv.s)+'</td><td>'+thDate(lv.e)+'</td>'
      +'<td style="text-align:center;font-weight:700">'+lv.days+'</td>'
      +'<td><span class="badge '+cls+'">'+lv.st+'</span></td>'
      +'<td><div class="fl g2">'+btns+'</div></td></tr>';
  }).join('');
}

function addLeave() {
  var nId=v('lvNurse'), s=v('lvS'), e=v('lvE');
  if(!nId||!s||!e){ toast('กรุณากรอกข้อมูลให้ครบ','e'); return; }
  var n=staff.find(function(x){ return x.id===nId; });
  var days=Math.round((new Date(e)-new Date(s))/86400000)+1;
  leaves.push({id:'L'+Date.now(),nId,name:'พว.'+n.f+' '+n.l,type:v('lvType'),s,e,days,st:'รออนุมัติ'});
  closeM('mLeave'); renderLeaves();
  toast('ส่งคำขอลาสำเร็จ','s');
  addNotif('leave',n.f+' '+n.l+' แจ้งลา '+days+' วัน');
  syncNow();
}

function approveLv(id) {
  var lv=leaves.find(function(x){ return x.id===id; });
  if(!lv) return;
  lv.st='อนุมัติ';
  var cur=new Date(lv.s), end=new Date(lv.e);
  while(cur<=end){ sched[lv.nId+'|'+cur.toISOString().split('T')[0]]='leave'; cur.setDate(cur.getDate()+1); }
  renderLeaves(); renderSchedule();
  toast('อนุมัติการลา '+lv.name+' แล้ว','s');
}

function rejectLv(id) {
  var lv=leaves.find(function(x){ return x.id===id; });
  if(!lv||!confirm('ปฏิเสธคำขอลา?')) return;
  lv.st='ปฏิเสธ'; renderLeaves(); toast('ปฏิเสธคำขอลาแล้ว','w');
}

// ════════════════════════════════════════════════════════════
//  SWAP
// ════════════════════════════════════════════════════════════
function renderSwaps() {
  var body=document.getElementById('swBody');
  if(!body) return;
  body.innerHTML=swaps.map(function(s){
    var cls={อนุมัติ:'bg',ปฏิเสธ:'br',รออนุมัติ:'ba'}[s.st]||'bgr';
    var btns='';
    if(s.st==='รออนุมัติ')
      btns='<button class="btn bgreen bsm" onclick="approveSwap(\''+s.id+'\')"><i class="fa-solid fa-check"></i>อนุมัติ</button>'
          +'<button class="btn bred bsm" onclick="rejectSwap(\''+s.id+'\')"><i class="fa-solid fa-xmark"></i></button>';
    return '<tr><td>'+s.req+'</td>'
      +'<td>'+thDate(s.fd)+' <span class="chip c'+s.fs+'" style="font-size:.72rem">'+s.fs+'</span></td>'
      +'<td>'+s.tgt+'</td>'
      +'<td>'+thDate(s.td)+' <span class="chip c'+s.ts+'" style="font-size:.72rem">'+s.ts+'</span></td>'
      +'<td>'+thDate(s.sub)+'</td>'
      +'<td><span class="badge '+cls+'">'+s.st+'</span></td>'
      +'<td><div class="fl g2">'+btns+'</div></td></tr>';
  }).join('');
  var pending=swaps.filter(function(s){ return s.st==='รออนุมัติ'; }).length;
  var badge=document.getElementById('swapBadge');
  if(badge){ badge.textContent=pending; badge.style.display=pending?'inline-block':'none'; }
}

function addSwap() {
  var rId=v('swReq'), tId=v('swTgt'), fd=v('swFD'), td=v('swTD');
  if(!rId||!tId||!fd||!td){ toast('กรุณากรอกข้อมูลให้ครบ','e'); return; }
  var rn=staff.find(function(s){ return s.id===rId; });
  var tn=staff.find(function(s){ return s.id===tId; });
  swaps.unshift({id:'S'+Date.now(),req:'พว.'+rn.f+' '+rn.l,fd,fs:v('swFS'),tgt:'พว.'+tn.f+' '+tn.l,td,ts:v('swTS'),sub:new Date().toISOString().split('T')[0],st:'รออนุมัติ'});
  closeM('mSwap'); renderSwaps();
  toast('ส่งคำขอแลกเวรสำเร็จ','s');
  addNotif('swap',rn.f+' ขอแลกเวรกับ '+tn.f);
}

function approveSwap(id) {
  var s=swaps.find(function(x){ return x.id===id; });
  if(!s) return; s.st='อนุมัติ';
  renderSwaps(); renderSchedule();
  toast('อนุมัติการแลกเวรแล้ว','s');
}

function rejectSwap(id) {
  var s=swaps.find(function(x){ return x.id===id; });
  if(!s||!confirm('ปฏิเสธ?')) return; s.st='ปฏิเสธ'; renderSwaps(); toast('ปฏิเสธแล้ว','w');
}

// ════════════════════════════════════════════════════════════
//  SHIFT TYPES
// ════════════════════════════════════════════════════════════
function renderTypes() {
  var body=document.getElementById('tyBody');
  if(!body) return;
  body.innerHTML=shiftTypes.map(function(t){
    return '<tr>'
      +'<td><span class="chip c'+t.code+'" style="font-size:.82rem">'+t.code+'</span></td>'
      +'<td style="font-weight:600">'+t.name+'</td>'
      +'<td>'+t.s+'</td><td>'+t.e+'</td><td>'+t.h+' ชม.</td>'
      +'<td><div style="width:22px;height:22px;border-radius:5px;background:'+t.col+';display:inline-block"></div></td>'
      +'<td><span class="badge bg">ใช้งาน</span></td>'
      +'<td><button class="btn bghost bsm" onclick="delType(\''+t.code+'\')"><i class="fa-solid fa-trash" style="color:var(--red)"></i></button></td></tr>';
  }).join('');
}

function addType() {
  var code=v('tyC').toUpperCase(), name=v('tyN');
  if(!code||!name){ toast('กรุณากรอกรหัสและชื่อ','e'); return; }
  var s=v('tyS'), e=v('tyE');
  var sh=parseInt(e.split(':')[0])-parseInt(s.split(':')[0]);
  if(sh<=0) sh+=24;
  shiftTypes.push({code,name,s,e,h:sh,col:v('tyCol')});
  closeM('mType'); renderTypes(); toast('เพิ่มประเภทเวรสำเร็จ','s');
}

function delType(code) {
  if(!confirm('ลบประเภทเวร '+code+'?')) return;
  shiftTypes=shiftTypes.filter(function(t){ return t.code!==code; });
  renderTypes(); toast('ลบแล้ว','s');
}

// ════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════
function renderNotifs() {
  var el=document.getElementById('ntList');
  if(!el) return;
  el.innerHTML=notifs.map(function(n){
    var ic={shift:'fa-calendar-day',swap:'fa-arrows-rotate',leave:'fa-calendar-xmark',system:'fa-gear'}[n.type]||'fa-bell';
    var col={shift:'var(--blue2)',swap:'var(--amber)',leave:'var(--teal)',system:'var(--text2)'}[n.type]||'var(--blue2)';
    return '<div style="display:flex;align-items:flex-start;gap:11px;padding:13px 18px;border-bottom:1px solid var(--border);'+(n.read?'':'background:var(--bluepale)')+'">'
      +'<div style="width:34px;height:34px;border-radius:9px;background:'+col+'20;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      +'<i class="fa-solid '+ic+'" style="color:'+col+'"></i></div>'
      +'<div style="flex:1"><div style="font-size:.88rem;'+(n.read?'':'font-weight:600')+'">'+n.msg+'</div>'
      +'<div style="font-size:.73rem;color:var(--text3);margin-top:2px">'+n.time+'</div></div>'
      +(n.read?'':'<button class="btn bghost bsm" onclick="markRead(\''+n.id+'\')"><i class="fa-solid fa-check"></i></button>')
      +'</div>';
  }).join('');
}

function markRead(id) { var n=notifs.find(function(x){ return x.id===id; }); if(n) n.read=true; renderNotifs(); }
function markAllRead() { notifs.forEach(function(n){ n.read=true; }); renderNotifs(); toast('อ่านทั้งหมดแล้ว','s'); }
function addNotif(type,msg) { notifs.unshift({id:'NT'+Date.now(),type,msg,time:'เมื่อกี้',read:false}); renderNotifs(); }

// ════════════════════════════════════════════════════════════
//  REPORTS
// ════════════════════════════════════════════════════════════
function renderReportCharts() {
  setTimeout(function(){
    var c1=document.getElementById('chWork');
    if(c1&&!CH.work){
      CH.work=new Chart(c1,{type:'bar',
        data:{labels:staff.slice(0,8).map(function(s){ return s.f; }),
          datasets:[{label:'เวรเดือนนี้',data:staff.slice(0,8).map(function(s){ return s.sh; }),backgroundColor:'rgba(37,99,184,.7)',borderRadius:5}]},
        options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:'#f1f5f9'},max:26},y:{grid:{display:false}}}}
      });
    }
    var c2=document.getElementById('chOT');
    if(c2&&!CH.ot){
      CH.ot=new Chart(c2,{type:'bar',
        data:{labels:staff.slice(0,8).map(function(s){ return s.f; }),
          datasets:[
            {label:'OT (ชม.)',data:[4,2,6,3,2,0,4,2],backgroundColor:'rgba(217,119,6,.7)',borderRadius:4},
            {label:'เวรดึก',  data:[6,4,8,5,3,2,7,4],backgroundColor:'rgba(124,58,237,.7)',borderRadius:4},
          ]},
        options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{family:'Sarabun'}}}},
          scales:{y:{beginAtZero:true,grid:{color:'#f1f5f9'}},x:{grid:{display:false}}}}
      });
    }
  },100);
}

// ════════════════════════════════════════════════════════════
//  AI PAGE
// ════════════════════════════════════════════════════════════
function renderAIPage() {
  var iss=document.getElementById('aiIss');
  if(iss&&!iss.innerHTML){
    var issues=[
      {sev:'high',  msg:'พว.มาลี ใจดี มีเวรดึก 4 วันติดต่อกัน (22-25 มิ.ย.)'},
      {sev:'high',  msg:'ICU มีกำลังคนต่ำกว่าเกณฑ์วันที่ 28 มิ.ย.'},
      {sev:'medium',msg:'พว.รัตนา แสงทอง ทำงาน 23 วัน/เดือน (เกินมาตรฐาน)'},
      {sev:'low',   msg:'ER มีพยาบาล 2 คนยังไม่ได้รับมอบหมาย On Call'},
    ];
    iss.innerHTML=issues.map(function(i){
      var bg=i.sev==='high'?'var(--redl)':i.sev==='medium'?'var(--amberl)':'var(--bluepale)';
      var bc=i.sev==='high'?'#fca5a5':i.sev==='medium'?'#fde68a':'#bfdbfe';
      var col=i.sev==='high'?'var(--red)':i.sev==='medium'?'var(--amber)':'var(--blue2)';
      var ic=i.sev==='high'?'fa-circle-xmark':i.sev==='medium'?'fa-triangle-exclamation':'fa-circle-info';
      return '<div class="airow" style="background:'+bg+';border-color:'+bc+';color:'+col+';margin-bottom:8px"><i class="fa-solid '+ic+'"></i><span>'+i.msg+'</span></div>';
    }).join('');
  }
  setTimeout(function(){
    var c=document.getElementById('chFore');
    if(c&&!CH.fore){
      CH.fore=new Chart(c,{type:'line',
        data:{labels:['ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
          datasets:[
            {label:'จริง',    data:[42,43,41,44,46,48],borderColor:'#2563b8',tension:.4,fill:false},
            {label:'คาดการณ์',data:[42,44,43,46,48,50],borderColor:'#0d9488',borderDash:[5,5],tension:.4,fill:false},
          ]},
        options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{family:'Sarabun'}}}},
          scales:{y:{title:{display:true,text:'จำนวนพยาบาล'},grid:{color:'#f1f5f9'}},x:{grid:{display:false}}}}
      });
    }
  },100);
}

async function askAI() {
  var q=(document.getElementById('aiQ')||{value:''}).value.trim();
  if(!q) return;
  var card=document.getElementById('aiCard');
  var ans=document.getElementById('aiAns');
  if(!card||!ans) return;
  card.style.display='block';
  ans.innerHTML='<div class="spin" style="margin:auto;width:28px;height:28px"></div>';
  document.getElementById('aiQ').value='';

  var ctx='คุณคือผู้เชี่ยวชาญจัดตารางเวรพยาบาล ข้อมูล: พยาบาล '+staff.length+' คน แผนก ICU/ER/OPD/Ward A/Ward B/OR'
    +' เวรเช้า 14 เวรบ่าย 12 เวรดึก 8 On Call 2 ปัญหา: มีพยาบาล 1 คนทำเวรดึก 4 คืนติดต่อกัน ICU กำลังคนต่ำ\n\nคำถาม: '+q+'\n\nตอบภาษาไทย กระชับ ปฏิบัติได้จริง';
  try {
    var res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:ctx}]})
    });
    var data=await res.json();
    ans.textContent=data.content&&data.content[0]?data.content[0].text:'ไม่สามารถตอบได้';
  } catch(ex) {
    var fb={
      'ใคร':'พว.มาลี ใจดี ทำงานมากที่สุด 22 เวร/เดือน และมีเวรดึก 8 ครั้ง ควรพิจารณาลดภาระ',
      'icu':'ICU ต้องการพยาบาลเพิ่ม 1 คนในวันที่ 28 มิ.ย. แนะนำดึงจาก Ward B ที่มีกำลังสำรอง',
      'คาดการณ์':'เดือนหน้าต้องการพยาบาลเพิ่ม 2-3 คนช่วงวันหยุดยาว โดยเฉพาะเวรดึก',
    };
    var found=Object.keys(fb).find(function(k){ return q.toLowerCase().includes(k); });
    ans.textContent=found?fb[found]:'แนะนำให้ตรวจสอบภาระงานรายบุคคล กระจายเวรดึกให้สมดุล และตรวจสอบ ICU ให้มีพยาบาลอย่างน้อย 4 คนทุกเวร';
  }
  card.scrollIntoView({behavior:'smooth'});
}

// ════════════════════════════════════════════════════════════
//  GOOGLE SHEETS SYNC
// ════════════════════════════════════════════════════════════
async function syncNow() {
  var url=conf('gasUrl');
  if(!url){ toast('ยังไม่ได้ตั้งค่า Google Sheets URL','w'); return; }
  toast('กำลัง Sync...','info');
  var rows=Object.entries(sched).map(function(kv){
    var parts=kv[0].split('|');
    var nId=parts[0], date=parts[1], shift=kv[1];
    var n=staff.find(function(s){ return s.id===nId; });
    return [nId,date,shift,n?n.dept:'','',new Date().toISOString()];
  });
  try {
    await gasPost(url,'saveSchedule',{rows:rows});
    toast('✅ Sync สำเร็จ','s');
  } catch(ex) {
    toast('Sync: '+ex.message,'e');
  }
}

async function testConn() {
  var url=(document.getElementById('gasUrl')||{value:''}).value.trim();
  if(!url){ toast('กรุณาใส่ URL','e'); return; }
  var el=document.getElementById('connStatus');
  el.innerHTML='<span style="color:var(--amber)"><i class="fa-solid fa-spinner fa-spin"></i> กำลังทดสอบ...</span>';
  try {
    var res=await fetch(url+'?action=ping');
    var data=await res.json();
    if(data.ok){
      el.innerHTML='<div style="background:var(--greenl);border:1px solid #86efac;border-radius:var(--rsm);padding:11px;color:var(--green)">'
        +'<i class="fa-solid fa-check-circle"></i> เชื่อมต่อสำเร็จ! '+data.data.msg+'<br><small>'+data.data.email+'</small></div>';
      document.getElementById('ss3').className='sstep done';
      document.getElementById('ss4').className='sstep done';
    } else throw new Error(data.error);
  } catch(ex) {
    el.innerHTML='<div style="background:var(--amberl);border:1px solid #fde68a;border-radius:var(--rsm);padding:11px;color:var(--amber);font-size:.83rem">'
      +'<i class="fa-solid fa-triangle-exclamation"></i> เชื่อมต่อไม่ได้ — ตรวจ URL และ Deploy settings<br><small>'+ex.message+'</small></div>';
  }
}

async function initGSheets() {
  var url=(document.getElementById('gasUrl')||{value:''}).value.trim()||conf('gasUrl');
  if(!url){ toast('กรุณาใส่ URL ก่อน','e'); return; }
  toast('กำลังสร้าง Sheets...','info');
  try {
    var res=await fetch(url+'?action=init');
    var data=await res.json();
    toast(data.ok?'✅ สร้าง Sheets เสร็จสิ้น! ('+data.data.created.join(', ')+')':data.error, data.ok?'s':'e');
  } catch(ex){
    toast('ไม่สามารถเชื่อมต่อ: '+ex.message,'e');
  }
}

function saveConf() {
  var url=(document.getElementById('gasUrl')||{value:''}).value.trim();
  var sid=(document.getElementById('sheetId')||{value:''}).value.trim();
  var em =(document.getElementById('gEmail')||{value:'stpfac@gmail.com'}).value.trim();
  conf('gasUrl',url); conf('sheetId',sid); conf('email',em);
  if(url) document.getElementById('ss3').className='sstep done';
  toast('บันทึกการตั้งค่าสำเร็จ','s');
}

async function gasPost(url, action, body) {
  var res=await fetch(url,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(Object.assign({action},body))
  });
  return res.json();
}

function copyCode() {
  var fullCode = document.getElementById('gasPreview').textContent;
  // Try to get the full GAS code from Code.gs if possible
  var code = '// ไฟล์ Code.gs — วางใน Google Apps Script\n// ดูรายละเอียดในไฟล์ Code.gs ที่ดาวน์โหลดมา';
  navigator.clipboard.writeText(code).then(function(){ toast('คัดลอก Code แล้ว — ดูไฟล์ Code.gs ที่แนบมา','s'); })
    .catch(function(){ toast('ดูไฟล์ Code.gs ที่ดาวน์โหลดไว้','w'); });
}

// notify channels
function testLine() {
  var t=(document.getElementById('lineToken')||{value:''}).value.trim();
  if(!t){ toast('กรุณาใส่ LINE Token','e'); return; }
  var url=conf('gasUrl');
  if(url) gasPost(url,'notify',{lineToken:t,message:'🏥 NurseSync ทดสอบ LINE Notify',type:'test',subject:'Test'})
    .then(function(r){ toast(r.ok?'LINE: '+r.data.results[0]:'Error','s'); }).catch(function(){ toast('ส่งแล้ว (ตรวจสอบที่ GAS)','w'); });
  else toast('ต้องตั้งค่า GAS URL ก่อน','w');
}
function testEmail() {
  var em=(document.getElementById('emailTo')||{value:'stpfac@gmail.com'}).value.trim();
  var url=conf('gasUrl');
  if(url) gasPost(url,'notify',{email:em,message:'🏥 NurseSync ทดสอบ Email',type:'test',subject:'NurseSync Test'})
    .then(function(r){ toast(r.ok?'Email: '+r.data.results[0]:'Error','s'); }).catch(function(){ toast('ส่งแล้ว (ตรวจสอบที่ GAS)','w'); });
  else toast('ต้องตั้งค่า GAS URL ก่อน','w');
}
function testTelegram() {
  var t=(document.getElementById('tgToken')||{value:''}).value.trim();
  var c=(document.getElementById('tgChat')||{value:''}).value.trim();
  if(!t||!c){ toast('กรุณาใส่ Bot Token และ Chat ID','e'); return; }
  var url=conf('gasUrl');
  if(url) gasPost(url,'notify',{telegramToken:t,telegramChat:c,message:'🏥 NurseSync ทดสอบ Telegram',type:'test'})
    .then(function(r){ toast(r.ok?'Telegram: '+r.data.results[0]:'Error','s'); }).catch(function(){ toast('ส่งแล้ว','w'); });
  else toast('ต้องตั้งค่า GAS URL ก่อน','w');
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════
function fillNurseSelects() {
  var opts=staff.map(function(s){ return '<option value="'+s.id+'">'+s.pfx+s.f+' '+s.l+' ('+s.dept+')</option>'; }).join('');
  ['shNurse','lvNurse','swReq','swTgt'].forEach(function(id){ var el=document.getElementById(id); if(el) el.innerHTML=opts; });
}

function thDate(ds) {
  if(!ds) return '-';
  var p=ds.split('-');
  var mn=['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return parseInt(p[2])+' '+mn[parseInt(p[1])]+' '+(parseInt(p[0])+543);
}

function v(id) { var el=document.getElementById(id); return el?el.value:''; }
function setEl(id,t) { var el=document.getElementById(id); if(el) el.textContent=t; }

function openM(id) { document.getElementById(id).classList.add('on'); }
function closeM(id) { document.getElementById(id).classList.remove('on'); }

function showLoad() { document.getElementById('lov').classList.add('on'); }
function hideLoad() { document.getElementById('lov').classList.remove('on'); }

function toast(msg, type) {
  type=type||'info';
  var icons={s:'fa-circle-check',e:'fa-circle-xmark',w:'fa-triangle-exclamation',info:'fa-circle-info'};
  var el=document.createElement('div');
  el.className='toast '+(type==='s'?'s':type==='e'?'e':type==='w'?'w':'');
  el.innerHTML='<i class="fa-solid '+(icons[type]||icons.info)+' toast-i"></i><p>'+msg+'</p>';
  document.getElementById('tcon').appendChild(el);
  setTimeout(function(){ el.style.opacity='0';el.style.transform='translateX(16px)';el.style.transition='all .3s';setTimeout(function(){ el.remove(); },300); },3500);
}
